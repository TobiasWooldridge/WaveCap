"""Whisper transcription integration."""

from __future__ import annotations

import asyncio
import inspect
import logging
import threading
from typing import Any, List, Optional, Tuple

import numpy as np
from faster_whisper import WhisperModel

try:  # pragma: no cover - depends on optional CUDA runtime availability
    import ctranslate2  # type: ignore
except Exception:  # pragma: no cover - absence of CUDA/ctranslate2 is expected on CPU-only envs
    ctranslate2 = None  # type: ignore[assignment]

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
        self, audio: np.ndarray, sample_rate: int, language: Optional[str]
    ) -> TranscriptionResultBundle:
        raise NotImplementedError

    def transcribe_blocking(
        self, audio: np.ndarray, sample_rate: int, language: Optional[str]
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
        self, audio: np.ndarray, sample_rate: int, language: Optional[str]
    ) -> TranscriptionResultBundle:
        return await asyncio.to_thread(
            self.transcribe_blocking, audio, sample_rate, language
        )

    def transcribe_blocking(
        self, audio: np.ndarray, sample_rate: int, language: Optional[str]
    ) -> TranscriptionResultBundle:
        with self._semaphore:
            model = self._ensure_model_blocking()
            LOGGER.debug("Running Whisper inference on %s samples", audio.shape[0])
            segments, info = self._run_model_transcription(model, audio, language)
        return self._build_result_bundle(segments, info)

    def _run_model_transcription(
        self, model: WhisperModel, audio: np.ndarray, language: Optional[str]
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
        if self.config.initialPrompt:
            kwargs["initial_prompt"] = self.config.initialPrompt
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
        self, audio: np.ndarray, sample_rate: int, language: Optional[str]
    ) -> TranscriptionResultBundle:
        return TranscriptionResultBundle(self.text, [], language)

    def transcribe_blocking(
        self, audio: np.ndarray, sample_rate: int, language: Optional[str]
    ) -> TranscriptionResultBundle:
        return TranscriptionResultBundle(self.text, [], language)


__all__ = [
    "AbstractTranscriber",
    "WhisperTranscriber",
    "PassthroughTranscriber",
    "TranscriptionResultBundle",
]
