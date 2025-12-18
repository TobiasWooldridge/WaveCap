"""Whisper transcription integration."""

from __future__ import annotations

import asyncio
import inspect
import logging
import platform
import threading
from typing import Any, List, Optional, Tuple, TYPE_CHECKING

if TYPE_CHECKING:
    import multiprocessing

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
        "overflow",  # For __next_prime overflow and similar numerical errors
    )

    # Fatal Metal errors that indicate unrecoverable GPU state (don't retry excessively)
    METAL_FATAL_PATTERNS = (
        "out of memory",
        "device lost",
        "gpu hang",
        "allocation failed",
    )

    def __init__(self, config: WhisperConfig, *, preload_model: bool = True):
        if mlx_whisper is None:
            raise RuntimeError("mlx-whisper is not installed. Install with: pip install mlx-whisper")
        self.config = config
        self._model_path = self._resolve_model_path(config.model)
        concurrency = self._resolve_concurrency(config.maxConcurrentProcesses)
        self._semaphore = threading.Semaphore(concurrency)
        self._max_retries = 5  # More retries for transient Metal GPU errors
        self._max_retries_fatal = 2  # Fewer retries for fatal errors
        self._base_retry_delay = 1.0  # Base delay in seconds (exponential backoff)
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

    def _is_fatal_metal_error(self, exc: BaseException) -> bool:
        """Check if this is a fatal Metal error that's unlikely to recover."""
        message = str(exc).lower()
        return any(pattern.lower() in message for pattern in self.METAL_FATAL_PATTERNS)

    def _run_transcription_with_retry(
        self,
        audio: np.ndarray,
        language: Optional[str],
        initial_prompt: Optional[str],
    ) -> dict:
        """Run transcription with retry logic for transient Metal GPU errors.

        Uses adaptive retry counts:
        - Fatal errors (OOM, device lost): limited retries with longer delays
        - Transient errors (encoder issues): more retries with exponential backoff
        - Non-Metal errors: no retry
        """
        import gc
        import time

        last_exception: Optional[BaseException] = None
        attempt = 0

        while True:
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

                # Determine max retries based on error severity
                is_fatal = self._is_fatal_metal_error(exc)
                max_retries = self._max_retries_fatal if is_fatal else self._max_retries
                error_type = "fatal" if is_fatal else "transient"

                attempt += 1
                if attempt > max_retries:
                    LOGGER.error(
                        "MLX Whisper transcription failed after %d attempts (%s Metal error): %s",
                        attempt,
                        error_type,
                        exc,
                    )
                    raise

                # Exponential backoff: 1s, 2s, 4s, 8s, 16s (capped at 30s)
                delay = min(self._base_retry_delay * (2 ** (attempt - 1)), 30.0)

                LOGGER.warning(
                    "MLX Whisper %s Metal GPU error (attempt %d/%d), retrying in %.1fs: %s",
                    error_type,
                    attempt,
                    max_retries + 1,
                    delay,
                    exc,
                )

                # Try to help GPU recover by forcing garbage collection
                gc.collect()

                time.sleep(delay)

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


# ============================================================================
# Subprocess-isolated MLX Transcriber
# ============================================================================
# This runs MLX in a separate process to isolate Metal GPU crashes from the
# main application. When Metal crashes the subprocess, the main app survives
# and can spawn a new subprocess.


def _mlx_worker_process(
    request_queue: "multiprocessing.Queue[Any]",
    response_queue: "multiprocessing.Queue[Any]",
    model_path: str,
    config_dict: dict,
) -> None:
    """Worker process that runs MLX transcription in isolation.

    This function runs in a separate process. If Metal crashes, only this
    process dies - the main application continues.
    """
    import signal

    # Ignore SIGINT in worker - let parent handle it
    signal.signal(signal.SIGINT, signal.SIG_IGN)

    try:
        import mlx_whisper as mlx  # Import here to keep Metal in subprocess

        # Load model once at startup
        LOGGER.info("MLX subprocess: Loading model %s", model_path)
        dummy_audio = np.zeros(1600, dtype=np.float32)
        mlx.transcribe(dummy_audio, path_or_hf_repo=model_path, verbose=False)
        LOGGER.info("MLX subprocess: Model loaded successfully")

        # Signal ready
        response_queue.put({"type": "ready"})

        # Process requests
        while True:
            try:
                request = request_queue.get(timeout=1.0)
            except Exception:
                continue

            if request is None:  # Shutdown signal
                break

            request_id = request.get("id")
            try:
                audio = request["audio"]
                language = request.get("language")
                initial_prompt = request.get("initial_prompt")
                temperature = config_dict.get("decodeTemperature", 0.0)
                condition_on_previous = config_dict.get("conditionOnPreviousText", True)

                kwargs: dict = {
                    "path_or_hf_repo": model_path,
                    "verbose": False,
                    "temperature": float(temperature),
                    "condition_on_previous_text": bool(condition_on_previous),
                }
                if language:
                    kwargs["language"] = language
                if initial_prompt:
                    kwargs["initial_prompt"] = initial_prompt

                result = mlx.transcribe(audio, **kwargs)
                response_queue.put({
                    "type": "result",
                    "id": request_id,
                    "result": result,
                })
            except Exception as exc:
                response_queue.put({
                    "type": "error",
                    "id": request_id,
                    "error": str(exc),
                    "error_type": type(exc).__name__,
                })

    except Exception as exc:
        LOGGER.error("MLX subprocess fatal error: %s", exc)
        try:
            response_queue.put({"type": "fatal", "error": str(exc)})
        except Exception:
            pass


class SubprocessMLXTranscriber(AbstractTranscriber):
    """MLX transcriber that runs in a separate process for crash isolation.

    When Metal/MLX crashes due to GPU issues, only the subprocess dies.
    The main application detects the crash and spawns a new subprocess,
    allowing transcription to continue.
    """

    SUBPROCESS_TIMEOUT = 120.0  # Max time for a single transcription
    STARTUP_TIMEOUT = 60.0  # Max time to wait for subprocess startup
    MAX_RESPAWN_ATTEMPTS = 3  # Max respawns before giving up

    def __init__(self, config: WhisperConfig, *, preload_model: bool = True):
        import multiprocessing

        if mlx_whisper is None:
            raise RuntimeError("mlx-whisper is not installed")

        self.config = config
        self._model_path = MLXWhisperTranscriber._resolve_model_path(config.model)
        self._config_dict = {
            "decodeTemperature": config.decodeTemperature,
            "conditionOnPreviousText": config.conditionOnPreviousText,
            "language": config.language,
            "initialPrompt": config.initialPrompt,
        }

        # Use spawn context for clean subprocess (fork can cause Metal issues)
        self._mp_context = multiprocessing.get_context("spawn")
        self._request_queue: Optional[multiprocessing.Queue] = None
        self._response_queue: Optional[multiprocessing.Queue] = None
        self._process: Optional[multiprocessing.Process] = None
        self._request_counter = 0
        self._lock = threading.Lock()
        self._respawn_count = 0

        concurrency = MLXWhisperTranscriber._resolve_concurrency(config.maxConcurrentProcesses)
        self._semaphore = threading.Semaphore(concurrency)

        if preload_model:
            self._ensure_subprocess()

    def _ensure_subprocess(self) -> bool:
        """Ensure the subprocess is running. Returns True if ready."""
        with self._lock:
            if self._process is not None and self._process.is_alive():
                return True

            # Clean up dead process
            if self._process is not None:
                LOGGER.warning("MLX subprocess died, respawning...")
                self._cleanup_subprocess()
                self._respawn_count += 1
                if self._respawn_count > self.MAX_RESPAWN_ATTEMPTS:
                    LOGGER.error(
                        "MLX subprocess respawn limit (%d) exceeded",
                        self.MAX_RESPAWN_ATTEMPTS,
                    )
                    return False

            return self._spawn_subprocess()

    def _spawn_subprocess(self) -> bool:
        """Spawn a new subprocess. Must be called with lock held."""
        try:
            LOGGER.info("Spawning MLX subprocess...")
            self._request_queue = self._mp_context.Queue()
            self._response_queue = self._mp_context.Queue()

            self._process = self._mp_context.Process(
                target=_mlx_worker_process,
                args=(
                    self._request_queue,
                    self._response_queue,
                    self._model_path,
                    self._config_dict,
                ),
                daemon=True,
            )
            self._process.start()

            # Wait for ready signal
            try:
                response = self._response_queue.get(timeout=self.STARTUP_TIMEOUT)
                if response.get("type") == "ready":
                    LOGGER.info("MLX subprocess ready (PID: %d)", self._process.pid)
                    self._respawn_count = 0  # Reset on successful start
                    return True
                elif response.get("type") == "fatal":
                    LOGGER.error("MLX subprocess failed to start: %s", response.get("error"))
                    self._cleanup_subprocess()
                    return False
            except Exception as exc:
                LOGGER.error("MLX subprocess startup timeout: %s", exc)
                self._cleanup_subprocess()
                return False

        except Exception as exc:
            LOGGER.error("Failed to spawn MLX subprocess: %s", exc)
            self._cleanup_subprocess()
            return False

        return False

    def _cleanup_subprocess(self) -> None:
        """Clean up subprocess resources. Must be called with lock held."""
        if self._process is not None:
            if self._process.is_alive():
                self._process.terminate()
                self._process.join(timeout=5.0)
                if self._process.is_alive():
                    self._process.kill()
            self._process = None

        # Clear queues
        for queue in (self._request_queue, self._response_queue):
            if queue is not None:
                try:
                    while not queue.empty():
                        queue.get_nowait()
                except Exception:
                    pass

        self._request_queue = None
        self._response_queue = None

    def close(self) -> None:
        """Shut down the subprocess."""
        with self._lock:
            if self._request_queue is not None:
                try:
                    self._request_queue.put(None)  # Shutdown signal
                except Exception:
                    pass
            self._cleanup_subprocess()

    def __del__(self) -> None:
        try:
            self.close()
        except Exception:
            pass

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
            return self._transcribe_with_retry(audio, language, initial_prompt)

    def _transcribe_with_retry(
        self,
        audio: np.ndarray,
        language: Optional[str],
        initial_prompt: Optional[str],
        max_retries: int = 2,
    ) -> TranscriptionResultBundle:
        """Transcribe with automatic retry on subprocess crash."""
        last_error: Optional[Exception] = None

        for attempt in range(max_retries + 1):
            if not self._ensure_subprocess():
                raise RuntimeError("Failed to start MLX subprocess")

            try:
                return self._send_transcription_request(audio, language, initial_prompt)
            except RuntimeError as exc:
                last_error = exc
                error_msg = str(exc).lower()

                # Check if this is a subprocess crash or communication failure
                retryable_indicators = (
                    "subprocess",
                    "crashed",
                    "died",
                    "broken pipe",
                    "errno 32",
                    "not running",
                )
                is_retryable = any(ind in error_msg for ind in retryable_indicators)

                if is_retryable:
                    # Force cleanup dead subprocess and reset respawn count
                    with self._lock:
                        self._cleanup_subprocess()
                        self._respawn_count = 0
                    if attempt < max_retries:
                        LOGGER.warning(
                            "MLX subprocess communication failed (attempt %d/%d), respawning...",
                            attempt + 1,
                            max_retries + 1,
                        )
                        continue

                # Non-retryable error
                raise

        assert last_error is not None
        raise last_error

    def _send_transcription_request(
        self,
        audio: np.ndarray,
        language: Optional[str],
        initial_prompt: Optional[str],
    ) -> TranscriptionResultBundle:
        """Send a transcription request to the subprocess."""
        with self._lock:
            if self._request_queue is None or self._response_queue is None:
                raise RuntimeError("MLX subprocess not running")

            if self._process is None or not self._process.is_alive():
                raise RuntimeError("MLX subprocess crashed")

            self._request_counter += 1
            request_id = self._request_counter

        effective_language = language or self._config_dict.get("language")
        effective_prompt = initial_prompt or self._config_dict.get("initialPrompt")

        # Send request
        self._request_queue.put({
            "id": request_id,
            "audio": audio,
            "language": effective_language,
            "initial_prompt": effective_prompt,
        })

        # Wait for response
        start_time = threading.Event()
        deadline = self.SUBPROCESS_TIMEOUT

        while deadline > 0:
            # Check if subprocess is still alive
            with self._lock:
                if self._process is None or not self._process.is_alive():
                    raise RuntimeError("MLX subprocess died during transcription")

            try:
                response = self._response_queue.get(timeout=min(1.0, deadline))

                if response.get("id") != request_id:
                    continue  # Response for different request (shouldn't happen with semaphore)

                if response.get("type") == "result":
                    return MLXWhisperTranscriber._build_result_bundle(response["result"])
                elif response.get("type") == "error":
                    raise RuntimeError(f"MLX transcription error: {response.get('error')}")
                elif response.get("type") == "fatal":
                    raise RuntimeError(f"MLX subprocess crashed: {response.get('error')}")

            except Exception as exc:
                if "Empty" in type(exc).__name__:
                    deadline -= 1.0
                    continue
                raise

        raise RuntimeError("MLX transcription timeout")


def create_transcriber(config: WhisperConfig, *, preload_model: bool = True) -> AbstractTranscriber:
    """Factory function to create the appropriate transcriber based on config and platform.

    For MLX on Apple Silicon, uses subprocess isolation to protect the main
    application from Metal GPU crashes.
    """
    backend = config.backend.lower()

    if backend == "mlx":
        if not mlx_available():
            raise RuntimeError(
                "MLX backend requested but not available. "
                "MLX requires Apple Silicon and mlx-whisper to be installed."
            )
        LOGGER.info("Using subprocess-isolated MLX Whisper backend (explicitly configured)")
        return SubprocessMLXTranscriber(config, preload_model=preload_model)

    if backend == "faster-whisper":
        LOGGER.info("Using faster-whisper backend (explicitly configured)")
        return WhisperTranscriber(config, preload_model=preload_model)

    # Auto-detect best backend
    if backend == "auto":
        if mlx_available():
            LOGGER.info("Using subprocess-isolated MLX Whisper backend (auto-detected Apple Silicon)")
            return SubprocessMLXTranscriber(config, preload_model=preload_model)
        LOGGER.info("Using faster-whisper backend (auto-detected)")
        return WhisperTranscriber(config, preload_model=preload_model)

    # Unknown backend, default to faster-whisper
    LOGGER.warning("Unknown backend '%s', falling back to faster-whisper", backend)
    return WhisperTranscriber(config, preload_model=preload_model)


__all__ = [
    "AbstractTranscriber",
    "WhisperTranscriber",
    "MLXWhisperTranscriber",
    "SubprocessMLXTranscriber",
    "PassthroughTranscriber",
    "TranscriptionResultBundle",
    "create_transcriber",
    "mlx_available",
    "is_apple_silicon",
]
