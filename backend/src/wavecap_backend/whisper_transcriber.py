"""Whisper transcription integration."""

from __future__ import annotations

import asyncio
import inspect
import logging
import platform
import threading
from typing import Any, List, Optional, Tuple

import numpy as np
from faster_whisper import WhisperModel

try:  # pragma: no cover - depends on optional CUDA runtime availability
    import ctranslate2  # type: ignore
except Exception:  # pragma: no cover - absence of CUDA/ctranslate2 is expected on CPU-only envs
    ctranslate2 = None  # type: ignore[assignment]

try:  # pragma: no cover - mlx-whisper is optional, only available on Apple Silicon
    import mlx_whisper  # type: ignore
except Exception:  # pragma: no cover
    mlx_whisper = None  # type: ignore[assignment]

from .models import TranscriptionSegment, WhisperConfig

LOGGER = logging.getLogger(__name__)


class TranscriptionResultBundle:
    """Container for raw faster-whisper results."""

    def __init__(
        self,
        text: str,
        segments: List[TranscriptionSegment],
        language: Optional[str],
        no_speech_prob: Optional[float] = None,
        avg_logprob: Optional[float] = None,
    ):
        self.text = text
        self.segments = segments
        self.language = language
        self.no_speech_prob = no_speech_prob
        self.avg_logprob = avg_logprob


class AbstractTranscriber:
    async def transcribe(
        self,
        audio: np.ndarray,
        sample_rate: int,
        language: Optional[str],
        *,
        initial_prompt: Optional[str] = None,
    ) -> TranscriptionResultBundle:
        raise NotImplementedError

    def transcribe_blocking(
        self,
        audio: np.ndarray,
        sample_rate: int,
        language: Optional[str],
        *,
        initial_prompt: Optional[str] = None,
    ) -> TranscriptionResultBundle:
        raise NotImplementedError


class WhisperTranscriber(AbstractTranscriber):
    """Wraps the faster-whisper model."""

    def __init__(self, config: WhisperConfig, *, preload_model: bool = True):
        self.config = config
        self._model: Optional[WhisperModel] = None
        self._model_lock = threading.Lock()
        concurrency = self._resolve_concurrency(self.config.maxConcurrentProcesses)
        self._semaphore = threading.Semaphore(concurrency)
        self._param_support_lock = threading.Lock()
        self._transcribe_param_support: Optional[tuple[set[str], bool]] = None
        if preload_model:
            LOGGER.info("Loading Whisper model %s", self.config.model)
            self._model = self._create_model()

    @staticmethod
    def _is_gpu_runtime_error(exc: BaseException) -> bool:
        message = str(exc).lower()
        gpu_markers = (
            "cuda",
            "cudnn",
            "cublas",
            "gpu",
            "nvrtc",
        )
        return any(marker in message for marker in gpu_markers)

    def _load_cpu_model(self, model_name: str) -> WhisperModel:
        return WhisperModel(
            model_name,
            device="cpu",
            compute_type="float32",
        )

    def _gpu_runtime_available(self) -> bool:
        if ctranslate2 is None:
            LOGGER.info(
                "ctranslate2 unavailable; forcing CPU inference for Whisper model %s",
                self.config.model,
            )
            return False
        try:
            device_count = ctranslate2.get_cuda_device_count()
        except Exception as exc:  # pragma: no cover - defensive fallback
            LOGGER.warning(
                "Unable to query CUDA devices via ctranslate2; forcing CPU inference.",
                exc_info=exc,
            )
            return False
        if device_count <= 0:
            LOGGER.info(
                "No CUDA devices detected; forcing CPU inference for Whisper model %s",
                self.config.model,
            )
            return False
        return True

    def _create_model(self) -> WhisperModel:
        try:
            if self._gpu_runtime_available():
                return WhisperModel(self.config.model)
            fallback_model = self.config.cpuFallbackModel or self.config.model
            if fallback_model == self.config.model:
                LOGGER.info(
                    "Loading Whisper model %s on CPU.",
                    fallback_model,
                )
            else:
                LOGGER.info(
                    "Loading Whisper CPU fallback model %s.",
                    fallback_model,
                )
            return self._load_cpu_model(fallback_model)
        except (RuntimeError, OSError) as exc:
            if self._is_gpu_runtime_error(exc):
                fallback_model = self.config.cpuFallbackModel or self.config.model
                LOGGER.warning(
                    "Failed to initialize Whisper model '%s' on GPU. Falling back to CPU%s.",
                    self.config.model,
                    (
                        ""
                        if fallback_model == self.config.model
                        else f" with '{fallback_model}'"
                    ),
                    exc_info=exc,
                )
                try:
                    return self._load_cpu_model(fallback_model)
                except Exception as cpu_exc:  # pragma: no cover - defensive re-raise
                    LOGGER.critical(
                        "Failed to initialize Whisper model '%s' even after CPU fallback.",
                        fallback_model,
                        exc_info=cpu_exc,
                    )
                    raise RuntimeError(
                        "Failed to initialize Whisper model. Ensure all Whisper runtime dependencies are installed."
                    ) from cpu_exc
            LOGGER.critical(
                "Failed to initialize Whisper model '%s'. This usually indicates missing "
                "runtime dependencies such as CUDA or cuDNN.",
                self.config.model,
                exc_info=exc,
            )
            raise RuntimeError(
                "Failed to initialize Whisper model. Ensure all Whisper runtime dependencies are installed."
            ) from exc
        except Exception as exc:  # pragma: no cover - unexpected exceptions
            LOGGER.critical(
                "Failed to initialize Whisper model '%s'. This usually indicates missing "
                "runtime dependencies such as CUDA or cuDNN.",
                self.config.model,
                exc_info=exc,
            )
            raise RuntimeError(
                "Failed to initialize Whisper model. Ensure all Whisper runtime dependencies are installed."
            ) from exc

    @staticmethod
    def _resolve_concurrency(value: Optional[int]) -> int:
        try:
            parsed = int(value) if value is not None else 0
        except (TypeError, ValueError):
            parsed = 0
        if parsed <= 0:
            return 1
        return parsed

    def _ensure_model_blocking(self) -> WhisperModel:
        if self._model is None:
            with self._model_lock:
                if self._model is None:
                    LOGGER.info("Loading Whisper model %s", self.config.model)
                    self._model = self._create_model()
        assert self._model is not None
        return self._model

    def _get_transcribe_param_support(self, model: WhisperModel) -> tuple[set[str], bool]:
        if self._transcribe_param_support is None:
            with self._param_support_lock:
                if self._transcribe_param_support is None:
                    try:
                        signature = inspect.signature(model.transcribe)
                    except (TypeError, ValueError):
                        params = set()
                        accepts_var_kwargs = True
                    else:
                        params = set(signature.parameters)
                        accepts_var_kwargs = any(
                            parameter.kind == inspect.Parameter.VAR_KEYWORD
                            for parameter in signature.parameters.values()
                        )
                    self._transcribe_param_support = (params, accepts_var_kwargs)
        return self._transcribe_param_support

    async def transcribe(
        self,
        audio: np.ndarray,
        sample_rate: int,
        language: Optional[str],
        *,
        initial_prompt: Optional[str] = None,
    ) -> TranscriptionResultBundle:
        return await asyncio.to_thread(
            self.transcribe_blocking, audio, sample_rate, language, initial_prompt=initial_prompt
        )

    def transcribe_blocking(
        self,
        audio: np.ndarray,
        sample_rate: int,
        language: Optional[str],
        *,
        initial_prompt: Optional[str] = None,
    ) -> TranscriptionResultBundle:
        with self._semaphore:
            model = self._ensure_model_blocking()
            LOGGER.debug("Running Whisper inference on %s samples", audio.shape[0])
            segments, info = self._run_model_transcription(
                model, audio, language, override_initial_prompt=initial_prompt
            )
        return self._build_result_bundle(segments, info)

    def _run_model_transcription(
        self,
        model: WhisperModel,
        audio: np.ndarray,
        language: Optional[str],
        *,
        override_initial_prompt: Optional[str] = None,
    ) -> Tuple[List[Any], Any]:
        supported_params, accepts_var_kwargs = self._get_transcribe_param_support(model)
        kwargs: dict[str, Any] = {
            "language": language or self.config.language,
            "task": "transcribe",
            "beam_size": max(int(self.config.beamSize), 1),
            "temperature": float(self.config.decodeTemperature),
            "condition_on_previous_text": bool(self.config.conditionOnPreviousText),
            "without_timestamps": False,
        }
        if accepts_var_kwargs or "temperature_increment_on_fallback" in supported_params:
            kwargs["temperature_increment_on_fallback"] = max(
                float(self.config.temperatureIncrementOnFallback), 0.0
            )
        elif self.config.temperatureIncrementOnFallback:
            LOGGER.debug(
                "Skipping unsupported faster-whisper parameter 'temperature_increment_on_fallback'."
            )
        effective_prompt = override_initial_prompt or self.config.initialPrompt
        if effective_prompt:
            kwargs["initial_prompt"] = effective_prompt
        segment_iter, transcription_info = model.transcribe(audio, **kwargs)
        return list(segment_iter), transcription_info

    @staticmethod
    def _build_result_bundle(
        segments: List[Any], info: Any
    ) -> TranscriptionResultBundle:
        text_parts: List[str] = []
        segment_models: List[TranscriptionSegment] = []
        for segment in segments:
            text_parts.append(segment.text)
            segment_models.append(
                TranscriptionSegment(
                    id=segment.id,
                    text=segment.text,
                    no_speech_prob=segment.no_speech_prob,
                    temperature=segment.temperature,
                    avg_logprob=segment.avg_logprob,
                    compression_ratio=segment.compression_ratio,
                    start=segment.start,
                    end=segment.end,
                    seek=segment.seek,
                )
            )
        return TranscriptionResultBundle(
            "".join(text_parts).strip(),
            segment_models,
            info.language,
            getattr(info, "no_speech_prob", None),
            getattr(info, "avg_logprob", None),
        )


class PassthroughTranscriber(AbstractTranscriber):
    """A minimal stub used in tests."""

    def __init__(self, text: str = ""):
        self.text = text

    async def transcribe(
        self,
        audio: np.ndarray,
        sample_rate: int,
        language: Optional[str],
        *,
        initial_prompt: Optional[str] = None,
    ) -> TranscriptionResultBundle:
        return TranscriptionResultBundle(self.text, [], language)

    def transcribe_blocking(
        self,
        audio: np.ndarray,
        sample_rate: int,
        language: Optional[str],
        *,
        initial_prompt: Optional[str] = None,
    ) -> TranscriptionResultBundle:
        return TranscriptionResultBundle(self.text, [], language)


# Model name mapping from standard Whisper names to MLX Hub repos
MLX_MODEL_MAP = {
    "tiny": "mlx-community/whisper-tiny",
    "tiny.en": "mlx-community/whisper-tiny.en",
    "base": "mlx-community/whisper-base",
    "base.en": "mlx-community/whisper-base.en",
    "small": "mlx-community/whisper-small",
    "small.en": "mlx-community/whisper-small.en",
    "medium": "mlx-community/whisper-medium",
    "medium.en": "mlx-community/whisper-medium.en",
    "large": "mlx-community/whisper-large-v3",
    "large-v1": "mlx-community/whisper-large",
    "large-v2": "mlx-community/whisper-large-v2",
    "large-v3": "mlx-community/whisper-large-v3",
    "large-v3-turbo": "mlx-community/whisper-large-v3-turbo",
}


class MLXWhisperTranscriber(AbstractTranscriber):
    """Whisper transcriber using MLX for Apple Silicon."""

    # Metal GPU errors that indicate transient failures worth retrying
    METAL_ERROR_PATTERNS = (
        "uncommitted encoder",
        "commit command buffer",
        "MTLCommandBuffer",
        "IOGPUMetalCommandBuffer",
        "completed handler provided after commit",
        "failed assertion",
        "metal",
    )

    def __init__(self, config: WhisperConfig, *, preload_model: bool = True):
        if mlx_whisper is None:
            raise RuntimeError("mlx-whisper is not installed. Install with: pip install mlx-whisper")
        self.config = config
        self._model_path = self._resolve_model_path(config.model)
        concurrency = self._resolve_concurrency(config.maxConcurrentProcesses)
        self._semaphore = threading.Semaphore(concurrency)
        self._max_retries = 3
        self._retry_delay_seconds = 0.5
        if preload_model:
            LOGGER.info("Loading MLX Whisper model %s from %s", config.model, self._model_path)
            # Trigger model download/cache by doing a dummy transcription
            self._warmup_model()

    @staticmethod
    def _resolve_model_path(model_name: str) -> str:
        """Map standard model names to MLX Hub repo paths."""
        if model_name in MLX_MODEL_MAP:
            return MLX_MODEL_MAP[model_name]
        # If not in map, assume it's already a full path/repo
        if "/" in model_name:
            return model_name
        # Try mlx-community prefix
        return f"mlx-community/whisper-{model_name}"

    @staticmethod
    def _resolve_concurrency(value: Optional[int]) -> int:
        try:
            parsed = int(value) if value is not None else 0
        except (TypeError, ValueError):
            parsed = 0
        return max(parsed, 1)

    def _warmup_model(self) -> None:
        """Pre-download the model by running a tiny transcription."""
        try:
            # Create 0.1s of silence at 16kHz
            dummy_audio = np.zeros(1600, dtype=np.float32)
            mlx_whisper.transcribe(
                dummy_audio,
                path_or_hf_repo=self._model_path,
                verbose=False,
            )
            LOGGER.info("MLX Whisper model %s loaded successfully", self.config.model)
        except Exception as exc:
            LOGGER.warning("Failed to warmup MLX Whisper model: %s", exc)

    async def transcribe(
        self,
        audio: np.ndarray,
        sample_rate: int,
        language: Optional[str],
        *,
        initial_prompt: Optional[str] = None,
    ) -> TranscriptionResultBundle:
        return await asyncio.to_thread(
            self.transcribe_blocking, audio, sample_rate, language, initial_prompt=initial_prompt
        )

    def transcribe_blocking(
        self,
        audio: np.ndarray,
        sample_rate: int,
        language: Optional[str],
        *,
        initial_prompt: Optional[str] = None,
    ) -> TranscriptionResultBundle:
        with self._semaphore:
            LOGGER.debug("Running MLX Whisper inference on %s samples", audio.shape[0])
            result = self._run_transcription_with_retry(audio, language, initial_prompt)
        return self._build_result_bundle(result)

    def _is_metal_error(self, exc: BaseException) -> bool:
        """Check if an exception appears to be a Metal GPU error."""
        message = str(exc).lower()
        exc_type = type(exc).__name__.lower()
        combined = f"{exc_type}: {message}"
        return any(pattern.lower() in combined for pattern in self.METAL_ERROR_PATTERNS)

    def _run_transcription_with_retry(
        self,
        audio: np.ndarray,
        language: Optional[str],
        initial_prompt: Optional[str],
    ) -> dict:
        """Run transcription with retry logic for transient Metal GPU errors."""
        import time

        last_exception: Optional[BaseException] = None
        for attempt in range(self._max_retries + 1):
            try:
                return self._run_transcription(audio, language, initial_prompt)
            except Exception as exc:
                last_exception = exc
                if not self._is_metal_error(exc):
                    # Non-Metal error, don't retry
                    LOGGER.warning(
                        "MLX Whisper transcription failed with non-retryable error: %s",
                        exc,
                    )
                    raise

                if attempt < self._max_retries:
                    delay = self._retry_delay_seconds * (2 ** attempt)  # Exponential backoff
                    LOGGER.warning(
                        "MLX Whisper Metal GPU error (attempt %d/%d), retrying in %.1fs: %s",
                        attempt + 1,
                        self._max_retries + 1,
                        delay,
                        exc,
                    )
                    time.sleep(delay)
                else:
                    LOGGER.error(
                        "MLX Whisper transcription failed after %d attempts: %s",
                        self._max_retries + 1,
                        exc,
                    )

        # If we get here, all retries failed
        assert last_exception is not None
        raise last_exception

    def _run_transcription(
        self,
        audio: np.ndarray,
        language: Optional[str],
        initial_prompt: Optional[str],
    ) -> dict:
        effective_language = language or self.config.language
        effective_prompt = initial_prompt or self.config.initialPrompt

        kwargs: dict[str, Any] = {
            "path_or_hf_repo": self._model_path,
            "verbose": False,
            "temperature": float(self.config.decodeTemperature),
            "condition_on_previous_text": bool(self.config.conditionOnPreviousText),
        }

        if effective_language:
            kwargs["language"] = effective_language

        if effective_prompt:
            kwargs["initial_prompt"] = effective_prompt

        return mlx_whisper.transcribe(audio, **kwargs)

    @staticmethod
    def _build_result_bundle(result: dict) -> TranscriptionResultBundle:
        text = result.get("text", "").strip()
        language = result.get("language")
        raw_segments = result.get("segments", [])

        segment_models: List[TranscriptionSegment] = []
        for i, seg in enumerate(raw_segments):
            segment_models.append(
                TranscriptionSegment(
                    id=seg.get("id", i),
                    text=seg.get("text", ""),
                    no_speech_prob=seg.get("no_speech_prob", 0.0),
                    temperature=seg.get("temperature", 0.0),
                    avg_logprob=seg.get("avg_logprob", 0.0),
                    compression_ratio=seg.get("compression_ratio", 0.0),
                    start=seg.get("start", 0.0),
                    end=seg.get("end", 0.0),
                    seek=seg.get("seek", 0),
                )
            )

        # Extract aggregate metrics if available
        no_speech_prob = None
        avg_logprob = None
        if segment_models:
            no_speech_probs = [s.no_speech_prob for s in segment_models if s.no_speech_prob is not None]
            avg_logprobs = [s.avg_logprob for s in segment_models if s.avg_logprob is not None]
            if no_speech_probs:
                no_speech_prob = sum(no_speech_probs) / len(no_speech_probs)
            if avg_logprobs:
                avg_logprob = sum(avg_logprobs) / len(avg_logprobs)

        return TranscriptionResultBundle(text, segment_models, language, no_speech_prob, avg_logprob)


def is_apple_silicon() -> bool:
    """Check if running on Apple Silicon."""
    return platform.system() == "Darwin" and platform.machine() == "arm64"


def mlx_available() -> bool:
    """Check if MLX Whisper is available."""
    return mlx_whisper is not None and is_apple_silicon()


def create_transcriber(config: WhisperConfig, *, preload_model: bool = True) -> AbstractTranscriber:
    """Factory function to create the appropriate transcriber based on config and platform."""
    backend = config.backend.lower()

    if backend == "mlx":
        if not mlx_available():
            raise RuntimeError(
                "MLX backend requested but not available. "
                "MLX requires Apple Silicon and mlx-whisper to be installed."
            )
        LOGGER.info("Using MLX Whisper backend (explicitly configured)")
        return MLXWhisperTranscriber(config, preload_model=preload_model)

    if backend == "faster-whisper":
        LOGGER.info("Using faster-whisper backend (explicitly configured)")
        return WhisperTranscriber(config, preload_model=preload_model)

    # Auto-detect best backend
    if backend == "auto":
        if mlx_available():
            LOGGER.info("Using MLX Whisper backend (auto-detected Apple Silicon)")
            return MLXWhisperTranscriber(config, preload_model=preload_model)
        LOGGER.info("Using faster-whisper backend (auto-detected)")
        return WhisperTranscriber(config, preload_model=preload_model)

    # Unknown backend, default to faster-whisper
    LOGGER.warning("Unknown backend '%s', falling back to faster-whisper", backend)
    return WhisperTranscriber(config, preload_model=preload_model)


__all__ = [
    "AbstractTranscriber",
    "WhisperTranscriber",
    "MLXWhisperTranscriber",
    "PassthroughTranscriber",
    "TranscriptionResultBundle",
    "create_transcriber",
    "mlx_available",
    "is_apple_silicon",
]
