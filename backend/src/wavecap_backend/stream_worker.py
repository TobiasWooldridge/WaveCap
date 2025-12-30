"""Handles ingestion and transcription for a single stream."""

from __future__ import annotations

import asyncio
import inspect
import logging
import random
import re
import struct
import time
import uuid
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from functools import lru_cache
from typing import (
    AsyncIterator,
    Awaitable,
    Callable,
    Deque,
    Iterable,
    List,
    Pattern,
    Optional,
    Set,
    Tuple,
)

import numpy as np
import soundfile as sf

from .alerts import TranscriptionAlertEvaluator
from .database import StreamDatabase
from .datetime_utils import utcnow
from .audio_processing import AudioFrontEndConfig, AudioFrontEndProcessor
from .waveform import compute_waveform
from .models import (
    Stream,
    StreamStatus,
    TranscriptionResult,
    TranscriptionSegment,
    TrunkedRadioMetadata,
    WhisperConfig,
)
from .models import StreamSource
# Remote upstream support
from .models import RemoteUpstreamConfig
from .remote_streams import MultiUpstreamSelector
from .state_paths import RECORDINGS_DIR
from .stream_defaults import resolve_ignore_first_seconds
from .transcription_postprocessor import PhraseCanonicalizer
from .transcription_executor import TranscriptionExecutor
from .whisper_transcriber import AbstractTranscriber, TranscriptionResultBundle
from .llm_corrector import AbstractLLMCorrector, NoOpCorrector

BLANK_AUDIO_TOKEN = "[BLANK_AUDIO]"
UNABLE_TO_TRANSCRIBE_TOKEN = "[unable to transcribe]"

# Reconnection backoff configuration
RECONNECT_INITIAL_DELAY_SECONDS = 5.0  # Initial delay on first retry
RECONNECT_MAX_DELAY_SECONDS = 600.0    # Maximum backoff (10 minutes)
RECONNECT_BACKOFF_MULTIPLIER = 2.0     # Exponential multiplier
RECONNECT_JITTER_FACTOR = 0.25         # Random jitter up to 25% of delay

# Number of consecutive transcription failures before stopping the stream.
# Individual failures are logged and the chunk is skipped; only persistent
# failures trigger a stream stop.
MAX_CONSECUTIVE_TRANSCRIPTION_FAILURES = 5


@dataclass
class PreparedChunk:
    """Audio chunk ready for transcription."""

    samples: np.ndarray
    prefix_samples: int


class ChunkAccumulator:
    """Incrementally groups PCM samples into transcription-sized chunks."""

    def __init__(
        self,
        *,
        sample_rate: int,
        max_chunk_seconds: float,
        min_chunk_seconds: float,
        context_seconds: float,
        silence_threshold: float,
        silence_lookback_seconds: float,
        silence_hold_seconds: float,
        active_ratio_threshold: float,
    ) -> None:
        self.sample_rate = max(sample_rate, 1)
        self._max_chunk_samples = max(
            int(round(max_chunk_seconds * self.sample_rate)), self.sample_rate
        )
        self._min_chunk_samples = max(
            int(round(min_chunk_seconds * self.sample_rate)), 1
        )
        if self._min_chunk_samples > self._max_chunk_samples:
            self._min_chunk_samples = self._max_chunk_samples
        context_samples = max(int(round(context_seconds * self.sample_rate)), 0)
        self._context_samples = min(context_samples, self._min_chunk_samples)
        self._silence_threshold = max(silence_threshold, 0.0)
        self._silence_lookback_samples = max(
            int(round(silence_lookback_seconds * self.sample_rate)), 1
        )
        self._silence_hold_samples = max(
            int(round(silence_hold_seconds * self.sample_rate)), 0
        )
        self._active_ratio_threshold = min(max(active_ratio_threshold, 0.0), 1.0)

        self._buffer_segments: Deque[np.ndarray] = deque()
        self._buffer_total_samples = 0
        self._previous_tail = np.empty(0, dtype=np.float32)
        self._silence_duration_samples = 0
        self._last_window_silent = False

    def add_samples(self, samples: np.ndarray) -> List[PreparedChunk]:
        if samples.size == 0:
            return []
        float_samples = np.asarray(samples, dtype=np.float32).reshape(-1)
        if float_samples.size == 0:
            return []
        self._buffer_segments.append(float_samples)
        self._buffer_total_samples += float_samples.size
        self._update_silence_state(float_samples)
        ready: List[PreparedChunk] = []
        while True:
            total_samples = self._previous_tail.size + self._buffer_total_samples
            if total_samples == 0:
                break
            if total_samples >= self._max_chunk_samples:
                ready.append(self._build_chunk(self._max_chunk_samples))
                continue
            effective_samples = self._buffer_total_samples
            if (
                effective_samples >= self._min_chunk_samples
                and self._should_flush_for_silence()
            ):
                ready.append(self._build_chunk(total_samples))
                continue
            break
        return ready

    def flush(self) -> List[PreparedChunk]:
        total_samples = self._previous_tail.size + self._buffer_total_samples
        if total_samples == 0:
            return []
        chunk = self._build_chunk(total_samples)
        if chunk.samples.size <= chunk.prefix_samples:
            return []
        return [chunk]

    def _update_silence_state(self, new_samples: np.ndarray) -> None:
        if new_samples.size == 0:
            return
        required = self._silence_lookback_samples
        if required <= 0:
            return
        active_samples = 0
        counted_samples = 0
        remaining = required
        for segment in reversed(self._buffer_segments):
            if remaining <= 0:
                break
            if segment.size == 0:
                continue
            window = segment[-remaining:]
            active_samples += int(
                np.count_nonzero(np.abs(window) > self._silence_threshold)
            )
            counted_samples += window.size
            remaining -= window.size
        if remaining > 0 and self._previous_tail.size > 0:
            window = self._previous_tail[-remaining:]
            if window.size:
                active_samples += int(
                    np.count_nonzero(np.abs(window) > self._silence_threshold)
                )
                counted_samples += window.size
        if counted_samples < required:
            return
        active_ratio = (
            float(active_samples / counted_samples) if counted_samples else 0.0
        )
        self._last_window_silent = active_ratio < self._active_ratio_threshold
        if self._last_window_silent:
            self._silence_duration_samples = min(
                self._silence_duration_samples + new_samples.size,
                self._max_chunk_samples,
            )
        else:
            self._silence_duration_samples = 0

    def _should_flush_for_silence(self) -> bool:
        if self._silence_hold_samples == 0:
            return self._last_window_silent
        return self._silence_duration_samples >= self._silence_hold_samples

    def _build_chunk(self, chunk_sample_count: int) -> PreparedChunk:
        total_available = self._previous_tail.size + self._buffer_total_samples
        chunk_sample_count = min(chunk_sample_count, total_available)
        prefix = self._previous_tail.copy()
        needed_from_buffer = max(chunk_sample_count - prefix.size, 0)
        body_parts: List[np.ndarray] = []
        while needed_from_buffer > 0 and self._buffer_segments:
            segment = self._buffer_segments[0]
            if segment.size <= needed_from_buffer:
                body_parts.append(segment)
                self._buffer_segments.popleft()
                self._buffer_total_samples -= segment.size
                needed_from_buffer -= segment.size
            else:
                body_parts.append(segment[:needed_from_buffer])
                self._buffer_segments[0] = segment[needed_from_buffer:]
                self._buffer_total_samples -= needed_from_buffer
                needed_from_buffer = 0
        body: np.ndarray
        if not body_parts:
            body = np.empty(0, dtype=np.float32)
        elif len(body_parts) == 1:
            body = body_parts[0]
        else:
            body = np.concatenate(body_parts)
        if prefix.size and body.size:
            samples = np.concatenate((prefix, body))
        elif prefix.size:
            samples = prefix
        elif body.size:
            samples = body
        else:
            samples = np.empty(0, dtype=np.float32)
        if self._context_samples > 0 and samples.size > 0:
            tail_start = max(samples.size - self._context_samples, 0)
            self._previous_tail = samples[tail_start:].copy()
        else:
            self._previous_tail = np.empty(0, dtype=np.float32)
        self._silence_duration_samples = 0
        self._last_window_silent = False
        return PreparedChunk(samples=samples, prefix_samples=prefix.size)


class _LiveAudioListener:
    """Buffers PCM audio for HTTP listeners without blocking transcription."""

    def __init__(self, queue_size: int = 32) -> None:
        self.queue: asyncio.Queue[Optional[bytes]] = asyncio.Queue(maxsize=queue_size)
        self._closed = False

    def feed(self, chunk: bytes) -> None:
        if self._closed or not chunk:
            return
        try:
            self.queue.put_nowait(chunk)
        except asyncio.QueueFull:
            try:
                self.queue.get_nowait()
            except asyncio.QueueEmpty:
                return
            else:
                self.queue.task_done()
            try:
                self.queue.put_nowait(chunk)
            except asyncio.QueueFull:
                return

    def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        try:
            self.queue.put_nowait(None)
        except asyncio.QueueFull:
            while True:
                try:
                    self.queue.get_nowait()
                except asyncio.QueueEmpty:
                    break
                else:
                    self.queue.task_done()
            try:
                self.queue.put_nowait(None)
            except asyncio.QueueFull:
                return


LOGGER = logging.getLogger(__name__)


class StreamWorker:
    """Background task that records audio and runs Whisper."""

    @staticmethod
    async def _async_noop(*_args, **_kwargs) -> None:
        return None

    def __init__(
        self,
        stream: Stream,
        transcriber: AbstractTranscriber,
        database: StreamDatabase,
        alert_evaluator: TranscriptionAlertEvaluator,
        on_transcription: Callable[[TranscriptionResult], Awaitable[None]],
        on_status_change: Callable[[Stream, StreamStatus], Awaitable[None]],
        on_upstream_disconnect: Optional[
            Callable[[Stream, int, float, Optional[str]], Awaitable[None]]
        ] = None,
        on_upstream_reconnect: Optional[
            Callable[[Stream, int], Awaitable[None]]
        ] = None,
        *,
        config: WhisperConfig,
        transcription_executor: Optional[TranscriptionExecutor] = None,
        initial_prompt: Optional[str] = None,
        remote_upstreams: Optional[list[RemoteUpstreamConfig]] = None,
        llm_corrector: Optional[AbstractLLMCorrector] = None,
    ) -> None:
        self.stream = stream
        self.transcriber = transcriber
        self._transcription_executor = transcription_executor
        self._llm_corrector: AbstractLLMCorrector = llm_corrector or NoOpCorrector()
        self.database = database
        self.alert_evaluator = alert_evaluator
        self.on_transcription = on_transcription
        self.on_status_change = on_status_change
        self.on_upstream_disconnect = (
            on_upstream_disconnect or self._async_noop
        )
        self.on_upstream_reconnect = (
            on_upstream_reconnect or self._async_noop
        )

        self._upstream_connected = True
        self._pending_reconnect_attempt: Optional[int] = None
        self._initial_prompt = (initial_prompt or "").strip() or None
        self._remote_selector: Optional[MultiUpstreamSelector] = None
        self._remote_upstreams: Optional[list[RemoteUpstreamConfig]] = remote_upstreams

        self.sample_rate = max(config.sampleRate, 1)
        max_chunk_seconds = max(float(config.chunkLength), 1.0)
        min_chunk_seconds = max(
            min(float(config.minChunkDurationSeconds), max_chunk_seconds), 0.25
        )
        context_seconds = max(float(config.contextSeconds), 0.0)
        silence_threshold = max(float(config.silenceThreshold), 0.0)
        silence_lookback_seconds = max(float(config.silenceLookbackSeconds), 0.1)
        silence_hold_seconds = max(float(config.silenceHoldSeconds), 0.0)
        active_ratio_threshold = min(
            max(float(config.activeSamplesInLookbackPct), 0.0), 1.0
        )

        self._chunker = ChunkAccumulator(
            sample_rate=self.sample_rate,
            max_chunk_seconds=max_chunk_seconds,
            min_chunk_seconds=min_chunk_seconds,
            context_seconds=context_seconds,
            silence_threshold=silence_threshold,
            silence_lookback_seconds=silence_lookback_seconds,
            silence_hold_seconds=silence_hold_seconds,
            active_ratio_threshold=active_ratio_threshold,
        )

        self._silence_threshold = silence_threshold
        self._active_ratio_threshold = active_ratio_threshold
        self._blank_audio_min_duration = (
            float(config.blankAudioMinDurationSeconds)
            if config.blankAudioMinDurationSeconds is not None
            else max(0.75, min_chunk_seconds)
        )
        blank_ratio = (
            min(max(float(config.blankAudioMinActiveRatio), 0.0), 1.0)
            if config.blankAudioMinActiveRatio is not None
            else active_ratio_threshold
        )
        self._blank_audio_min_active_ratio = blank_ratio
        self._blank_audio_min_rms = (
            max(float(config.blankAudioMinRms), 0.0)
            if config.blankAudioMinRms is not None
            else silence_threshold
        )
        self._no_audio_reconnect_seconds = (
            float(config.noAudioReconnectSeconds)
            if config.noAudioReconnectSeconds is not None
            else None
        )
        self._last_audio_activity_monotonic = (
            time.monotonic() if self._no_audio_reconnect_seconds is not None else None
        )
        self._last_inactivity_duration: Optional[float] = None
        self._low_energy_peak_threshold = min(
            max(self._silence_threshold * 3.0, 0.04),
            1.0,
        )
        self._low_energy_rms_threshold = min(
            max(self._silence_threshold * 1.5, 0.01),
            1.0,
        )
        self._hallucination_phrases = self._prepare_hallucination_phrases(
            config.silenceHallucinationPhrases,
            self._initial_prompt or config.initialPrompt,
        )
        self._advertisement_phrases = self._prepare_advertisement_phrases(
            config.advertisementFilterPhrases
        )

        deemphasis_seconds = (
            None
            if config.deemphasisTimeConstantMicros is None
            else float(config.deemphasisTimeConstantMicros) * 1e-6
        )
        highpass_cutoff = (
            float(config.highpassCutoffHz)
            if config.highpassCutoffHz is not None
            else None
        )
        lowpass_cutoff = (
            float(config.lowpassCutoffHz)
            if config.lowpassCutoffHz is not None
            else None
        )
        frontend_config = AudioFrontEndConfig(
            sample_rate=self.sample_rate,
            highpass_cutoff_hz=highpass_cutoff,
            lowpass_cutoff_hz=lowpass_cutoff,
            deemphasis_time_constant=deemphasis_seconds,
            agc_target_rms=None,
        )
        self._audio_frontend = AudioFrontEndProcessor(frontend_config)
        self._agc_target_rms = (
            float(config.agcTargetRms)
            if config.agcTargetRms is not None
            else max(self._silence_threshold * 2.0, 0.01)
        )
        self._phrase_canonicalizer = PhraseCanonicalizer.with_default_phrases()
        repetition_min_chars = int(config.segmentRepetitionMinCharacters or 0)
        repetition_max_allowed_repeats = int(
            config.segmentRepetitionMaxAllowedConsecutiveRepeats or 0
        )
        self._segment_repetition_min_chars: Optional[int]
        self._segment_repetition_max_allowed_repeats: Optional[int]
        if repetition_min_chars > 0 and repetition_max_allowed_repeats > 0:
            self._segment_repetition_min_chars = repetition_min_chars
            self._segment_repetition_max_allowed_repeats = (
                repetition_max_allowed_repeats
            )
        else:
            self._segment_repetition_min_chars = None
            self._segment_repetition_max_allowed_repeats = None

        self._live_audio_lock = asyncio.Lock()
        self._live_audio_listeners: Set[_LiveAudioListener] = set()
        self._live_audio_header = self._build_wav_header(self.sample_rate)

        self._task: Optional[asyncio.Task[None]] = None
        self._stop_event = asyncio.Event()
        self._chunk_queue: Optional[asyncio.Queue[Optional[PreparedChunk]]] = None
        self._worker_tasks: List[asyncio.Task[None]] = []
        self._worker_failure: Optional[BaseException] = None
        self._consecutive_failures = 0
        self._consecutive_failures_lock = asyncio.Lock()
        self._worker_count = self._resolve_concurrency(config.maxConcurrentProcesses)
        self._blocking_supported: Optional[bool] = None
        bytes_per_sample = 2  # s16le output from ffmpeg
        target_read_seconds = 1.0
        self._read_size_bytes = max(
            int(self.sample_rate * bytes_per_sample * target_read_seconds), 32768
        )
        self._queue_maxsize = max(self._worker_count * 4, 8)
        RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
        ignore_seconds = resolve_ignore_first_seconds(
            self.stream.source,
            getattr(self.stream, "url", None),
            getattr(stream, "ignoreFirstSeconds", 0.0),
        )
        self.stream.ignoreFirstSeconds = ignore_seconds
        self._ignore_initial_samples = max(
            int(round(ignore_seconds * self.sample_rate)), 0
        )

        # Silent-stream reconnect watchdog
        try:
            threshold = (
                float(config.silentStreamReconnectSeconds)
                if getattr(config, "silentStreamReconnectSeconds", None) is not None
                else 3600.0
            )
        except Exception:
            threshold = 3600.0
        self._silent_reconnect_seconds = max(float(threshold), 0.0)
        self._last_non_silent_monotonic = time.monotonic()
        # Watchdog for upstream stalls (no PCM bytes received from ffmpeg)
        try:
            stall_seconds = (
                float(config.upstreamNoDataReconnectSeconds)
                if getattr(config, "upstreamNoDataReconnectSeconds", None) is not None
                else 120.0
            )
        except Exception:
            stall_seconds = 120.0
        self._no_data_reconnect_seconds = max(float(stall_seconds or 0.0), 0.0)
        self._last_byte_monotonic = time.monotonic()
        # Keep ffmpeg read waits bounded so it can self-recover on network blips
        self._ffmpeg_rw_timeout_us = int(15.0 * 1e6)
        # Track last disconnect cause to tailor backoff
        self._last_disconnect_was_stall = False

    def start(self) -> None:
        if self._task and not self._task.done():
            raise RuntimeError("Stream worker already running")
        self._stop_event.clear()
        self._task = asyncio.create_task(
            self._run(), name=f"stream-worker-{self.stream.id}"
        )

    async def stop(self) -> None:
        self._stop_event.set()
        if self._task:
            await self._task

    async def _run(self) -> None:
        try:
            await self.on_status_change(self.stream, StreamStatus.TRANSCRIBING)
            await self._run_pipeline()
        except Exception as exc:  # pylint: disable=broad-except
            LOGGER.exception("Stream %s failed: %s", self.stream.id, exc)
            self.stream.error = str(exc)
            await self.on_status_change(self.stream, StreamStatus.ERROR)
        else:
            await self.on_status_change(self.stream, StreamStatus.STOPPED)
        finally:
            await self._shutdown_live_audio()

    @staticmethod
    def _resolve_concurrency(value: Optional[int]) -> int:
        try:
            parsed = int(value) if value is not None else 0
        except (TypeError, ValueError):
            parsed = 0
        if parsed <= 0:
            return 1
        return parsed

    @staticmethod
    def _build_wav_header(sample_rate: int) -> bytes:
        channels = 1
        bits_per_sample = 16
        byte_rate = sample_rate * channels * bits_per_sample // 8
        block_align = channels * bits_per_sample // 8
        riff_size = 0xFFFFFFFF
        data_size = 0xFFFFFFFF
        return (
            b"RIFF"
            + struct.pack("<I", riff_size)
            + b"WAVEfmt "
            + struct.pack(
                "<IHHIIHH",
                16,
                1,
                channels,
                sample_rate,
                byte_rate,
                block_align,
                bits_per_sample,
            )
            + b"data"
            + struct.pack("<I", data_size)
        )

    async def _register_live_audio_listener(
        self, listener: _LiveAudioListener
    ) -> None:
        async with self._live_audio_lock:
            self._live_audio_listeners.add(listener)
            listener_count = len(self._live_audio_listeners)
        LOGGER.info(
            "Live audio listener registered for stream %s (listeners=%d)",
            self.stream.id,
            listener_count,
        )

    async def _unregister_live_audio_listener(
        self, listener: _LiveAudioListener
    ) -> None:
        async with self._live_audio_lock:
            self._live_audio_listeners.discard(listener)
            listener_count = len(self._live_audio_listeners)
        LOGGER.info(
            "Live audio listener removed for stream %s (listeners=%d)",
            self.stream.id,
            listener_count,
        )

    async def _broadcast_live_audio(self, pcm_bytes: bytes) -> None:
        if not pcm_bytes:
            return
        async with self._live_audio_lock:
            listeners = tuple(self._live_audio_listeners)
        if not listeners:
            return
        LOGGER.debug(
            "Broadcasting %d bytes of live audio for stream %s to %d listener(s)",
            len(pcm_bytes),
            self.stream.id,
            len(listeners),
        )
        for listener in listeners:
            listener.feed(pcm_bytes)

    async def _shutdown_live_audio(self) -> None:
        async with self._live_audio_lock:
            listeners = tuple(self._live_audio_listeners)
            self._live_audio_listeners.clear()
        if listeners:
            LOGGER.info(
                "Shutting down %d live audio listener(s) for stream %s",
                len(listeners),
                self.stream.id,
            )
        for listener in listeners:
            listener.close()

    async def iter_live_audio(self) -> AsyncIterator[bytes]:
        listener = _LiveAudioListener()
        await self._register_live_audio_listener(listener)
        try:
            yield self._live_audio_header
            while True:
                chunk = await listener.queue.get()
                if chunk is None:
                    listener.queue.task_done()
                    break
                try:
                    yield chunk
                finally:
                    listener.queue.task_done()
        finally:
            listener.close()
            await self._unregister_live_audio_listener(listener)
    def _start_transcription_workers(self) -> None:
        if self._chunk_queue is not None:
            raise RuntimeError("Transcription workers already running")
        self._chunk_queue = asyncio.Queue(maxsize=self._queue_maxsize)
        self._worker_failure = None
        self._consecutive_failures = 0
        self._worker_tasks = [
            asyncio.create_task(
                self._transcription_worker(index),
                name=f"stream-worker-{self.stream.id}-transcriber-{index}",
            )
            for index in range(self._worker_count)
        ]

    async def _shutdown_transcription_workers(self, *, flush: bool) -> None:
        queue = self._chunk_queue
        if queue is None:
            return
        try:
            if flush and self._worker_failure is None:
                await self._flush_pending_chunks()
                try:
                    await asyncio.wait_for(queue.join(), timeout=30.0)
                except asyncio.TimeoutError:
                    LOGGER.warning(
                        "Timed out waiting for transcription queue to drain for stream %s; "
                        "continuing with shutdown",
                        self.stream.id,
                    )
            else:
                # Drop any buffered audio to avoid re-processing when resuming.
                self._chunker.flush()
                while True:
                    try:
                        queue.get_nowait()
                    except asyncio.QueueEmpty:
                        break
                    else:
                        queue.task_done()
        finally:
            # Proactively cancel worker coroutines to reduce await times
            # during shutdown. Underlying threads may continue, but we
            # won't block the event loop waiting on model inference.
            for task in self._worker_tasks:
                if not task.done():
                    task.cancel()
            for task in self._worker_tasks:
                if not task.done():
                    await queue.put(None)
            await asyncio.gather(*self._worker_tasks, return_exceptions=True)
            self._worker_tasks.clear()
            self._chunk_queue = None

    async def _run_pipeline(self) -> None:
        import asyncio.subprocess

        self._start_transcription_workers()
        worker_failure: Optional[BaseException] = None
        worker_failed = False
        next_reconnect_attempt = 0
        self._upstream_connected = True
        self._pending_reconnect_attempt = None
        try:
            # Remote sources: multiplex bytes from multiple upstreams
            if self.stream.source == StreamSource.REMOTE:
                selector = MultiUpstreamSelector(
                    upstreams=self._remote_upstreams or [],
                    target_sample_rate=self.sample_rate,
                    read_size_bytes=self._read_size_bytes,
                )
                self._remote_selector = selector
                await selector.start()
                try:
                    # Trunked mode: complete calls arrive with metadata
                    if selector.has_trunked_upstreams:
                        await self._run_trunked_pipeline(selector)
                    else:
                        # Standard remote mode: raw PCM bytes
                        while not self._stop_event.is_set():
                            picked = await selector.read(timeout=0.5)
                            if picked is None:
                                continue
                            _source_id, chunk = picked
                            await self._ingest_pcm_bytes(chunk)
                        await self._flush_pending_chunks()
                finally:
                    await selector.stop()
                return

            while not self._stop_event.is_set():
                if self._worker_failure is not None:
                    worker_failure = self._worker_failure
                    self._worker_failure = None
                    worker_failed = True
                    break
                if next_reconnect_attempt > 0:
                    should_continue = await self._wait_before_reconnect(
                        next_reconnect_attempt
                    )
                    if not should_continue:
                        break
                session_should_reconnect = False
                session_returncode: Optional[int] = None
                process: Optional[asyncio.subprocess.Process]
                process = None
                try:
                    process = await asyncio.create_subprocess_exec(
                        "ffmpeg",
                        "-nostdin",
                        "-hide_banner",
                        "-loglevel",
                        "warning",
                        # Help ffmpeg recover from short network interruptions
                        "-reconnect",
                        "1",
                        "-reconnect_streamed",
                        "1",
                        "-reconnect_at_eof",
                        "1",
                        "-rw_timeout",
                        str(self._ffmpeg_rw_timeout_us),
                        # Some hosts gate by user agent; present a generic UA
                        "-user_agent",
                        "WaveCap/1.0 (+https://example.invalid)",
                        "-i",
                        self.stream.url,
                        # Decode to mono 16k s16le PCM on stdout
                        "-vn",
                        "-ac",
                        "1",
                        "-ar",
                        str(self.sample_rate),
                        "-f",
                        "s16le",
                        "-",
                        stdout=asyncio.subprocess.PIPE,
                        stderr=asyncio.subprocess.PIPE,
                    )
                except Exception as exc:  # pragma: no cover - defensive startup
                    worker_failure = exc
                    worker_failed = True
                    break
                assert process.stdout is not None
                # Fresh session; measure stall from this point until first bytes arrive
                self._last_byte_monotonic = time.monotonic()
                try:
                    while True:
                        if self._worker_failure is not None:
                            worker_failure = self._worker_failure
                            self._worker_failure = None
                            worker_failed = True
                            break
                        if self._stop_event.is_set():
                            LOGGER.debug(
                                "Stop event set for stream %s; exiting read loop",
                                self.stream.id,
                            )
                            break
                        try:
                            chunk = await asyncio.wait_for(
                                process.stdout.read(self._read_size_bytes),
                                timeout=0.5,
                            )
                        except asyncio.TimeoutError:
                            # First, check for upstream stall (no PCM bytes received)
                            if self._no_data_reconnect_seconds > 0.0:
                                elapsed_nd = time.monotonic() - self._last_byte_monotonic
                                if elapsed_nd >= self._no_data_reconnect_seconds:
                                    attempt_number = max(next_reconnect_attempt + 1, 1)
                                    reason = (
                                        f"no data received from upstream for "
                                        f"{self._format_duration_phrase(elapsed_nd)}"
                                    )
                                    self._upstream_connected = False
                                    self._pending_reconnect_attempt = attempt_number
                                    delay_seconds = self._reconnect_delay_seconds(attempt_number)
                                    await self.on_upstream_disconnect(
                                        self.stream, attempt_number, delay_seconds, reason
                                    )
                                    self._last_disconnect_was_stall = True
                                    session_should_reconnect = True
                                    break
                            # Also check for prolonged low‑energy silence (audio flowing)
                            if (
                                self.stream.source == StreamSource.AUDIO
                                and self._silent_reconnect_seconds > 0.0
                            ):
                                elapsed = time.monotonic() - self._last_non_silent_monotonic
                                if elapsed >= self._silent_reconnect_seconds:
                                    attempt_number = max(next_reconnect_attempt + 1, 1)
                                    LOGGER.info(
                                        "Audio stream %s silent for %.0f seconds; scheduling reconnect attempt %d",
                                        self.stream.id,
                                        elapsed,
                                        attempt_number,
                                    )
                                    self._upstream_connected = False
                                    self._pending_reconnect_attempt = attempt_number
                                    delay_seconds = self._reconnect_delay_seconds(attempt_number)
                                    reason = f"no audio detected for {self._format_duration_phrase(elapsed)}"
                                    await self.on_upstream_disconnect(
                                        self.stream, attempt_number, delay_seconds, reason
                                    )
                                    session_should_reconnect = True
                                    break
                            continue
                        if not chunk:
                            attempt_number = max(next_reconnect_attempt + 1, 1)
                            LOGGER.warning(
                                "Audio stream %s ended; scheduling reconnect attempt %d",
                                self.stream.id,
                                attempt_number,
                            )
                            self._upstream_connected = False
                            self._pending_reconnect_attempt = attempt_number
                            delay_seconds = self._reconnect_delay_seconds(
                                attempt_number
                            )
                            await self.on_upstream_disconnect(
                                self.stream, attempt_number, delay_seconds, None
                            )
                            session_should_reconnect = True
                            break
                        next_reconnect_attempt = 0
                        self._last_byte_monotonic = time.monotonic()
                        if not self._upstream_connected:
                            attempt_value = self._pending_reconnect_attempt or 1
                            self._upstream_connected = True
                            self._pending_reconnect_attempt = None
                            self._last_disconnect_was_stall = False
                            await self.on_upstream_reconnect(
                                self.stream, attempt_value
                            )
                            # Reset ad-skip counter so ignoreFirstSeconds applies
                            # to reconnects (e.g. Broadcastify pre-roll ads).
                            ignore_seconds = getattr(
                                self.stream, "ignoreFirstSeconds", 0.0
                            )
                            self._ignore_initial_samples = max(
                                int(round(ignore_seconds * self.sample_rate)), 0
                            )
                            # Reset audio filter state to avoid transients from
                            # stale values accumulated in the previous session.
                            self._audio_frontend.reset()
                        had_audio = await self._ingest_pcm_bytes(chunk)
                        # Check inactivity window (no audio seen)
                        if self._check_audio_inactivity(had_audio):
                            await self._handle_inactivity_disconnect(
                                next_reconnect_attempt
                            )
                            session_should_reconnect = True
                            break
                        # After ingest, check if stream has been silent for too long
                        if (
                            self.stream.source == StreamSource.AUDIO
                            and self._silent_reconnect_seconds > 0.0
                        ):
                            elapsed = time.monotonic() - self._last_non_silent_monotonic
                            if elapsed >= self._silent_reconnect_seconds:
                                attempt_number = max(next_reconnect_attempt + 1, 1)
                                LOGGER.info(
                                    "Audio stream %s silent for %.0f seconds; scheduling reconnect attempt %d",
                                    self.stream.id,
                                    elapsed,
                                    attempt_number,
                                )
                                self._upstream_connected = False
                                self._pending_reconnect_attempt = attempt_number
                                delay_seconds = self._reconnect_delay_seconds(attempt_number)
                                reason = f"no audio detected for {self._format_duration_phrase(elapsed)}"
                                await self.on_upstream_disconnect(
                                    self.stream, attempt_number, delay_seconds, reason
                                )
                                session_should_reconnect = True
                                break
                finally:
                    if process is not None:
                        if process.returncode is None:
                            LOGGER.debug(
                                "Terminating ffmpeg process for stream %s", self.stream.id
                            )
                            process.terminate()
                            try:
                                await asyncio.wait_for(process.wait(), timeout=5)
                            except asyncio.TimeoutError:
                                LOGGER.warning(
                                    "Timed out waiting for ffmpeg to terminate for stream %s; killing process",
                                    self.stream.id,
                                )
                                process.kill()
                                try:
                                    await asyncio.wait_for(process.wait(), timeout=2)
                                except asyncio.TimeoutError:
                                    LOGGER.error(
                                        "FFmpeg process %s for stream %s did not terminate after kill; "
                                        "possible zombie process",
                                        process.pid,
                                        self.stream.id,
                                    )
                        session_returncode = process.returncode
                if worker_failed or worker_failure is not None:
                    break
                if not self._stop_event.is_set() and self._worker_failure is None:
                    await self._flush_pending_chunks()
                if self._stop_event.is_set():
                    break
                if self._worker_failure is not None:
                    worker_failure = self._worker_failure
                    self._worker_failure = None
                    worker_failed = True
                    break
                if session_should_reconnect:
                    next_reconnect_attempt += 1
                    continue
                if session_returncode not in (0, None):
                    attempt_number = max(next_reconnect_attempt + 1, 1)
                    LOGGER.warning(
                        "ffmpeg exited with code %s for stream %s; scheduling reconnect attempt %d",
                        session_returncode,
                        self.stream.id,
                        attempt_number,
                    )
                    self._upstream_connected = False
                    self._pending_reconnect_attempt = attempt_number
                    delay_seconds = self._reconnect_delay_seconds(attempt_number)
                    await self.on_upstream_disconnect(
                        self.stream, attempt_number, delay_seconds, None
                    )
                    next_reconnect_attempt += 1
                    continue
                break
        finally:
            if worker_failure is None and self._worker_failure is not None:
                worker_failure = self._worker_failure
                self._worker_failure = None
                worker_failed = True
            self._pending_reconnect_attempt = None
            self._upstream_connected = True
            # Prefer a fast shutdown when a stop is requested to avoid
            # long waits while Whisper finishes in-flight work.
            should_flush = (not worker_failed) and (not self._stop_event.is_set())
            await self._shutdown_transcription_workers(flush=should_flush)
        if worker_failure is not None:
            raise worker_failure

    async def _run_trunked_pipeline(self, selector: MultiUpstreamSelector) -> None:
        """Process trunked radio calls from WaveCap-SDR.

        Trunked radio calls arrive as complete audio chunks with metadata
        (talk group ID, source unit, frequency, etc.). Unlike continuous
        streams, each call is self-contained and doesn't need silence-based
        chunking.
        """
        from .trunked_radio import TrunkedCallChunk

        LOGGER.info(
            "Stream %s starting trunked radio pipeline",
            self.stream.id,
        )

        while not self._stop_event.is_set():
            if self._worker_failure is not None:
                break

            result = await selector.read_trunked(timeout=0.5)
            if result is None:
                continue

            source_id, chunk = result

            # Skip encrypted calls (no audio to transcribe)
            if chunk.metadata.encrypted:
                LOGGER.debug(
                    "Stream %s skipping encrypted call from TG %s",
                    self.stream.id,
                    chunk.metadata.talkgroupId,
                )
                continue

            # Skip very short calls that likely won't transcribe well
            if chunk.audio.size < self.sample_rate * 0.5:  # Less than 0.5 seconds
                LOGGER.debug(
                    "Stream %s skipping short call (%.2fs) from TG %s",
                    self.stream.id,
                    chunk.audio.size / self.sample_rate,
                    chunk.metadata.talkgroupId,
                )
                continue

            await self._transcribe_trunked_call(chunk)

    async def _transcribe_trunked_call(self, chunk) -> None:
        """Transcribe a complete trunked radio call with metadata."""
        from .trunked_radio import TrunkedCallChunk

        if not isinstance(chunk, TrunkedCallChunk):
            return

        if chunk.audio.size == 0:
            return

        # Apply audio preprocessing
        processed_audio = self._prepare_transcription_audio(chunk.audio)

        # Run transcription
        language = self.stream.language
        bundle = await self._run_transcription(
            processed_audio, self.sample_rate, language
        )

        text = bundle.text.strip()
        if text:
            text = self._phrase_canonicalizer.canonicalize(text)

        # Skip low-quality transcriptions
        if self._is_low_energy(chunk.audio):
            LOGGER.debug(
                "Stream %s TG %s dropping low-energy call",
                self.stream.id,
                chunk.metadata.talkgroupId,
            )
            return

        # Build segments list
        segments: Optional[List[TranscriptionSegment]] = None
        if bundle.segments:
            segments = []
            for segment in bundle.segments:
                segments.append(segment.model_copy())
                if text:
                    segment.text = self._phrase_canonicalizer.canonicalize(segment.text)

        # Handle hallucination detection
        effective_samples = chunk.audio
        confidence: Optional[float] = None
        if bundle.no_speech_prob is not None:
            confidence = float(max(0.0, min(1.0, 1.0 - bundle.no_speech_prob)))

        if text and self._should_discard_hallucination(
            text, effective_samples, confidence, bundle.avg_logprob
        ):
            LOGGER.debug(
                "Stream %s TG %s discarding hallucination: %s",
                self.stream.id,
                chunk.metadata.talkgroupId,
                text,
            )
            text = ""
            segments = None

        if text and self._is_punctuation_only(text):
            text = ""
            segments = None

        # Skip empty transcriptions
        if not text:
            return

        # Calculate duration
        duration = chunk.metadata.callDurationSeconds
        if duration is None:
            duration = chunk.audio.size / self.sample_rate

        # Save recording
        recording_file: Optional[Path] = None
        if chunk.audio.size > 0:
            recording_file = await self._write_recording(chunk.audio)

        # Calculate speech boundaries from segments
        speech_start_offset: Optional[float] = None
        speech_end_offset: Optional[float] = None
        if segments:
            valid_starts = [s.start for s in segments if s.start >= 0]
            valid_ends = [s.end for s in segments if s.end > 0]
            if valid_starts:
                speech_start_offset = min(valid_starts)
            if valid_ends:
                speech_end_offset = max(valid_ends)

        # Generate waveform for UI
        waveform_data: Optional[List[float]] = None
        if recording_file is not None and chunk.audio.size > 0:
            waveform_data = await asyncio.to_thread(
                compute_waveform, chunk.audio, duration=duration
            )

        # Apply LLM correction if enabled
        corrected_text: Optional[str] = None
        if text and text not in (BLANK_AUDIO_TOKEN, UNABLE_TO_TRANSCRIBE_TOKEN):
            try:
                correction_result = await self._llm_corrector.correct(text)
                if correction_result.discard:
                    LOGGER.debug(
                        "Stream %s TG %s LLM flagged as nonsense, skipping",
                        self.stream.id,
                        chunk.metadata.talkgroupId,
                    )
                    return
                if correction_result.changed:
                    corrected_text = correction_result.corrected_text
            except Exception as exc:
                LOGGER.warning(
                    "Stream %s TG %s LLM correction failed: %s",
                    self.stream.id,
                    chunk.metadata.talkgroupId,
                    exc,
                )

        # Create transcription with radio metadata
        transcription = TranscriptionResult(
            id=str(uuid.uuid4()),
            streamId=self.stream.id,
            text=text,
            correctedText=corrected_text,
            timestamp=utcnow(),
            confidence=confidence,
            duration=duration,
            segments=segments,
            recordingUrl=(
                f"/recordings/{recording_file.name}"
                if recording_file is not None
                else None
            ),
            speechStartOffset=speech_start_offset,
            speechEndOffset=speech_end_offset,
            waveform=waveform_data,
            radioMetadata=chunk.metadata,
        )

        # Evaluate alerts
        if text != BLANK_AUDIO_TOKEN:
            alerts = self.alert_evaluator.evaluate(text)
            if alerts:
                transcription.alerts = alerts

        await self.database.append_transcription(transcription)
        await self.on_transcription(transcription)

        LOGGER.debug(
            "Stream %s transcribed TG %s (%s): %s",
            self.stream.id,
            chunk.metadata.talkgroupId,
            chunk.metadata.talkgroupName or "unnamed",
            text[:50] + "..." if len(text) > 50 else text,
        )

    def _reconnect_delay_seconds(self, attempt: int) -> float:
        """Calculate reconnection delay with exponential backoff and jitter.

        Backoff sequence (approximate, before jitter):
          Attempt 1: 0s (immediate)
          Attempt 2: 5s
          Attempt 3: 10s
          Attempt 4: 20s
          Attempt 5: 40s
          Attempt 6: 80s
          Attempt 7+: 600s (capped)
        """
        if attempt <= 1:
            return 0.0
        # Exponential backoff: initial * multiplier^(attempt-2)
        base_delay = RECONNECT_INITIAL_DELAY_SECONDS * (
            RECONNECT_BACKOFF_MULTIPLIER ** (attempt - 2)
        )
        # Cap at maximum
        capped_delay = min(base_delay, RECONNECT_MAX_DELAY_SECONDS)
        # Add jitter to prevent thundering herd
        jitter = capped_delay * RECONNECT_JITTER_FACTOR * random.random()
        return capped_delay + jitter

    def _check_audio_inactivity(self, has_audio: bool) -> bool:
        threshold = self._no_audio_reconnect_seconds
        if threshold is None:
            return False
        now = time.monotonic()
        if has_audio:
            self._last_audio_activity_monotonic = now
            self._last_inactivity_duration = None
            return False
        last = self._last_audio_activity_monotonic
        if last is None:
            self._last_audio_activity_monotonic = now
            return False
        idle_seconds = max(now - last, 0.0)
        if idle_seconds >= threshold:
            self._last_audio_activity_monotonic = now
            self._last_inactivity_duration = idle_seconds
            return True
        self._last_inactivity_duration = idle_seconds
        return False

    @staticmethod
    def _format_duration_phrase(seconds: float) -> str:
        if seconds <= 0:
            return "0 seconds"
        if seconds < 60:
            seconds_value = max(int(round(seconds)), 1)
            unit = "second" if seconds_value == 1 else "seconds"
            return f"{seconds_value} {unit}"
        if seconds < 3600:
            minutes = seconds / 60.0
            rounded = round(minutes, 1)
            if abs(rounded - round(minutes)) < 1e-6:
                minutes_value = max(int(round(minutes)), 1)
                unit = "minute" if minutes_value == 1 else "minutes"
                return f"{minutes_value} {unit}"
            return f"{rounded:.1f} minutes"
        hours = seconds / 3600.0
        rounded = round(hours, 1)
        if abs(rounded - round(hours)) < 1e-6:
            hours_value = max(int(round(hours)), 1)
            unit = "hour" if hours_value == 1 else "hours"
            return f"{hours_value} {unit}"
        return f"{rounded:.1f} hours"

    def _format_inactivity_reason(self) -> str:
        duration = self._last_inactivity_duration
        if duration is None or duration <= 0:
            duration = self._no_audio_reconnect_seconds or 0.0
        phrase = self._format_duration_phrase(duration)
        return f"no audio detected for {phrase}"

    async def _handle_inactivity_disconnect(self, next_reconnect_attempt: int) -> None:
        attempt_number = max(next_reconnect_attempt + 1, 1)
        reason_detail = self._format_inactivity_reason()
        LOGGER.warning(
            "Stream %s detected inactivity (%s); scheduling reconnect attempt %d",
            self.stream.id,
            reason_detail,
            attempt_number,
        )
        self._upstream_connected = False
        self._pending_reconnect_attempt = attempt_number
        delay_seconds = self._reconnect_delay_seconds(attempt_number)
        await self.on_upstream_disconnect(
            self.stream,
            attempt_number,
            delay_seconds,
            reason_detail,
        )

    async def _wait_before_reconnect(self, attempt: int) -> bool:
        # Fast path for transport stalls: immediate retry, let ffmpeg self-reconnect
        if self._last_disconnect_was_stall:
            LOGGER.info(
                "Stalled upstream for stream %s; attempting immediate reconnect (attempt %d)",
                self.stream.id,
                attempt,
            )
            self._last_disconnect_was_stall = False
            return not self._stop_event.is_set()
        delay = self._reconnect_delay_seconds(attempt)
        if delay <= 0:
            LOGGER.info(
                "Attempting immediate reconnect for stream %s (attempt %d)",
                self.stream.id,
                attempt,
            )
            return not self._stop_event.is_set()
        LOGGER.info(
            "Waiting %.0f seconds before reconnecting stream %s (attempt %d)",
            delay,
            self.stream.id,
            attempt,
        )
        try:
            await asyncio.wait_for(self._stop_event.wait(), timeout=delay)
        except asyncio.TimeoutError:
            return not self._stop_event.is_set()
        return False

    async def _ingest_pcm_bytes(self, pcm_bytes: bytes) -> bool:
        if not pcm_bytes:
            return False
        total_samples = len(pcm_bytes) // 2
        if total_samples <= 0:
            return False
        int_samples = np.frombuffer(pcm_bytes, dtype=np.int16)
        if int_samples.size == 0:
            return False
        float_samples = int_samples.astype(np.float32) / 32768.0
        has_audio = bool(np.any(np.abs(float_samples) > self._silence_threshold))
        result = has_audio
        trimmed_int_samples = int_samples
        trimmed_float_samples = float_samples
        if self._ignore_initial_samples:
            if total_samples <= self._ignore_initial_samples:
                self._ignore_initial_samples -= total_samples
                return result
            skip_samples = self._ignore_initial_samples
            trimmed_int_samples = int_samples[skip_samples:]
            trimmed_float_samples = float_samples[skip_samples:]
            self._ignore_initial_samples = 0
        if trimmed_int_samples.size == 0:
            return result
        trimmed_bytes = trimmed_int_samples.tobytes()
        if len(trimmed_bytes) < 2:
            return result
        await self._broadcast_live_audio(trimmed_bytes)
        samples = trimmed_float_samples
        if samples.size == 0:
            return result
        # Update silence watchdog based on basic activity detection
        try:
            active_ratio = float(np.mean(np.abs(samples) > self._silence_threshold))
        except Exception:
            active_ratio = 0.0
        is_low_energy = self._is_low_energy(samples)
        if active_ratio >= self._active_ratio_threshold or not is_low_energy:
            self._last_non_silent_monotonic = time.monotonic()
        chunks = self._chunker.add_samples(samples)
        if not chunks:
            return result
        if self._chunk_queue is None:
            for chunk in chunks:
                await self._transcribe_chunk(chunk)
            return result
        for chunk in chunks:
            await self._chunk_queue.put(chunk)
        return result

    # Public API for server-side push ingest
    async def ingest_remote_push(self, source_id: str, data: bytes) -> None:
        selector = self._remote_selector
        if selector is None:
            raise RuntimeError("Remote ingest not available for this stream")
        await selector.push_bytes(source_id, data)

    def get_remote_upstream_states(self):
        selector = self._remote_selector
        if selector is None:
            return []
        return selector.states()

    async def _flush_pending_chunks(self) -> None:
        chunks = self._chunker.flush()
        if not chunks:
            return
        if self._chunk_queue is None:
            for chunk in chunks:
                await self._transcribe_chunk(chunk)
            return
        for chunk in chunks:
            await self._chunk_queue.put(chunk)

    async def _transcription_worker(self, _index: int) -> None:
        assert self._chunk_queue is not None
        queue = self._chunk_queue
        while True:
            chunk = await queue.get()
            if chunk is None:
                queue.task_done()
                break
            try:
                await self._transcribe_chunk(chunk)
                # Reset consecutive failure counter on success
                async with self._consecutive_failures_lock:
                    self._consecutive_failures = 0
            except Exception as exc:  # pylint: disable=broad-except
                should_stop = await self._handle_transcription_failure(exc)
                queue.task_done()
                if should_stop:
                    raise
                # Log and continue processing - don't stop the stream for isolated failures
                continue
            else:
                queue.task_done()

    async def _handle_transcription_failure(self, exc: BaseException) -> bool:
        """Handle a transcription failure, returning True if stream should stop.

        Tracks consecutive failures and only triggers a stream stop after
        exceeding MAX_CONSECUTIVE_TRANSCRIPTION_FAILURES. Individual failures
        are logged and skipped to keep the stream running.
        """
        async with self._consecutive_failures_lock:
            self._consecutive_failures += 1
            failure_count = self._consecutive_failures

        if failure_count >= MAX_CONSECUTIVE_TRANSCRIPTION_FAILURES:
            LOGGER.error(
                "Stream %s stopping after %d consecutive transcription failures: %s",
                self.stream.id,
                failure_count,
                exc,
            )
            if self._worker_failure is None:
                self._worker_failure = exc
            self._stop_event.set()
            return True

        # Log the failure but continue processing
        LOGGER.warning(
            "Stream %s transcription failed (failure %d/%d, continuing): %s",
            self.stream.id,
            failure_count,
            MAX_CONSECUTIVE_TRANSCRIPTION_FAILURES,
            exc,
        )
        return False

    async def _run_transcription(
        self, audio: np.ndarray, sample_rate: int, language: Optional[str]
    ) -> TranscriptionResultBundle:
        executor = self._transcription_executor
        if executor is not None and self._blocking_supported is not False:
            blocking_method = getattr(self.transcriber, "transcribe_blocking", None)
            if blocking_method is not None:
                try:
                    result = await executor.run(
                        lambda: blocking_method(
                            audio, sample_rate, language, initial_prompt=self._initial_prompt
                        )
                    )
                except NotImplementedError:
                    self._blocking_supported = False
                else:
                    self._blocking_supported = True
                    return result
            else:
                self._blocking_supported = False
        transcribe = self.transcriber.transcribe
        signature = inspect.signature(transcribe)
        if "initial_prompt" in signature.parameters:
            return await transcribe(
                audio,
                sample_rate,
                language,
                initial_prompt=self._initial_prompt,
            )
        return await transcribe(audio, sample_rate, language)

    async def _transcribe_chunk(self, chunk: PreparedChunk) -> None:
        if chunk.samples.size == 0:
            return
        prefix_samples = chunk.prefix_samples
        effective_samples = chunk.samples[prefix_samples:]
        if effective_samples.size == 0:
            return

        language = self.stream.language
        transcription_samples = self._prepare_transcription_audio(chunk.samples)
        bundle = await self._run_transcription(
            transcription_samples, self.sample_rate, language
        )

        start_offset_seconds = (
            prefix_samples / self.sample_rate if prefix_samples else 0.0
        )
        segments: List[TranscriptionSegment] = []
        text_parts: List[str] = []
        if bundle.segments:
            for segment in bundle.segments:
                if start_offset_seconds and segment.end <= start_offset_seconds:
                    continue
                adjusted = segment.model_copy()
                if start_offset_seconds and adjusted.start < start_offset_seconds:
                    adjusted.start = start_offset_seconds
                segments.append(adjusted)
                text_parts.append(adjusted.text)
            text = "".join(text_parts).strip()
        else:
            text = bundle.text.strip()

        if text:
            text = self._phrase_canonicalizer.canonicalize(text)
            if segments:
                for segment in segments:
                    segment.text = self._phrase_canonicalizer.canonicalize(
                        segment.text
                    )

        if (
            text
            and segments
            and self._segment_repetition_min_chars is not None
            and self._segment_repetition_max_allowed_repeats is not None
            and self._contains_repetitive_segment_text(segments)
        ):
            LOGGER.debug(
                "Stream %s marking chunk as untranscribable due to repeated segment text",
                self.stream.id,
            )
            text = ""
            segments = []

        confidence: Optional[float] = None
        if bundle.no_speech_prob is not None:
            confidence = float(max(0.0, min(1.0, 1.0 - bundle.no_speech_prob)))

        hallucination_discarded = False
        blank_due_to_hallucination = False
        if text and self._should_discard_hallucination(
            text, effective_samples, confidence, bundle.avg_logprob
        ):
            LOGGER.debug(
                "Stream %s discarding hallucinated silence phrase: %s",
                self.stream.id,
                text,
            )
            text = ""
            segments = []
            hallucination_discarded = True

        # Discard advertisements from streams like Broadcastify
        if text and self._is_advertisement(text):
            LOGGER.info(
                "Stream %s discarding advertisement: %s",
                self.stream.id,
                text,
            )
            text = ""
            segments = []

        if text and self._is_low_energy(effective_samples):
            LOGGER.debug(
                "Stream %s dropping low-energy transcription output: %s",
                self.stream.id,
                text,
            )
            text = ""
            segments = []

        if text and self._is_punctuation_only(text):
            text = ""
            segments = []

        blank_audio_emitted = False
        if not text:
            if self._should_emit_blank_audio(effective_samples):
                text = BLANK_AUDIO_TOKEN
                segments = []
                blank_audio_emitted = True
                if hallucination_discarded:
                    blank_due_to_hallucination = True
            elif self._is_mostly_silence(effective_samples, None):
                LOGGER.debug("Stream %s skipping silent chunk", self.stream.id)
                return
            else:
                text = UNABLE_TO_TRANSCRIBE_TOKEN
                segments = []

        # Leading-silence trimming is intentionally constrained to the carried
        # prefix context only. The high-level algorithm and rationale are
        # outlined in SPEC.md (Recording & Trimming Guarantees).
        trimmed_samples, trimmed_count = self._trim_leading_silence(
            chunk.samples, prefix_samples
        )
        if trimmed_count > 0:
            trimmed_seconds = trimmed_count / self.sample_rate
            start_offset_seconds = max(start_offset_seconds - trimmed_seconds, 0.0)
            if segments:
                for segment in segments:
                    new_start = max(segment.start - trimmed_seconds, 0.0)
                    if start_offset_seconds and new_start < start_offset_seconds:
                        new_start = start_offset_seconds
                    new_end = max(segment.end - trimmed_seconds, new_start)
                    if start_offset_seconds and new_end < start_offset_seconds:
                        new_end = start_offset_seconds
                    segment.start = new_start
                    segment.end = new_end

        trimmed_prefix_samples = max(prefix_samples - trimmed_count, 0)
        if trimmed_prefix_samples >= trimmed_samples.size:
            trimmed_effective_samples = np.empty(0, dtype=np.float32)
        else:
            trimmed_effective_samples = trimmed_samples[trimmed_prefix_samples:]
        effective_duration = (
            trimmed_effective_samples.size / self.sample_rate
            if trimmed_effective_samples.size > 0
            else trimmed_samples.size / self.sample_rate
        )

        recording_file: Optional[Path] = None
        # Ensure saved WAVs do not overlap: exclude any remaining prefix from file
        record_start_index = int(trimmed_prefix_samples)
        record_samples = (
            trimmed_samples[record_start_index:]
            if trimmed_samples.size > record_start_index
            else np.empty(0, dtype=np.float32)
        )
        skip_recording = text == BLANK_AUDIO_TOKEN and blank_due_to_hallucination
        should_store_recording = record_samples.size > 0 and not skip_recording
        if should_store_recording:
            # Persist recordings for anything that carried energy so editors can
            # replay questionable speech. Pure silence placeholders are skipped.
            recording_file = await self._write_recording(record_samples)
        # If we excluded the prefix from the saved file, shift segment timings
        # to be relative to the file start so UI playback aligns without a
        # recordingStartOffset.
        if start_offset_seconds and segments:
            for segment in segments:
                new_start = max(0.0, segment.start - start_offset_seconds)
                new_end = max(new_start, segment.end - start_offset_seconds)
                segment.start = new_start
                segment.end = new_end

        duration = float(
            effective_duration
            if effective_duration > 0
            else trimmed_samples.size / self.sample_rate
        )
        # Since we excluded prefix from the saved file, its local offset is 0
        recording_start_offset = None

        # Apply LLM correction for real transcriptions (not placeholders)
        corrected_text: Optional[str] = None
        if text and text not in (BLANK_AUDIO_TOKEN, UNABLE_TO_TRANSCRIBE_TOKEN):
            try:
                correction_result = await self._llm_corrector.correct(text)
                if correction_result.discard:
                    # LLM detected nonsense/unintelligible audio - skip this transcription
                    LOGGER.debug(
                        "Stream %s LLM flagged as nonsense, skipping: %r",
                        self.stream.id,
                        text,
                    )
                    return
                if correction_result.changed:
                    corrected_text = correction_result.corrected_text
                    LOGGER.debug(
                        "Stream %s LLM corrected: %r -> %r",
                        self.stream.id,
                        text,
                        corrected_text,
                    )
            except Exception as exc:
                LOGGER.warning(
                    "Stream %s LLM correction failed: %s", self.stream.id, exc
                )

        # Calculate speech boundary offsets from segment timing for optimized playback
        speech_start_offset: Optional[float] = None
        speech_end_offset: Optional[float] = None
        if segments:
            valid_starts = [s.start for s in segments if s.start >= 0]
            valid_ends = [s.end for s in segments if s.end > 0]
            if valid_starts:
                speech_start_offset = min(valid_starts)
            if valid_ends:
                speech_end_offset = max(valid_ends)

        # Generate amplitude waveform for UI visualization
        waveform_data: Optional[List[float]] = None
        if should_store_recording and record_samples.size > 0:
            waveform_data = await asyncio.to_thread(
                compute_waveform, record_samples, duration=duration
            )

        transcription = TranscriptionResult(
            id=str(uuid.uuid4()),
            streamId=self.stream.id,
            text=text,
            correctedText=corrected_text,
            timestamp=utcnow(),
            confidence=confidence,
            duration=duration,
            segments=segments or None,
            recordingUrl=(
                f"/recordings/{recording_file.name}"
                if recording_file is not None
                else None
            ),
            recordingStartOffset=recording_start_offset,
            speechStartOffset=speech_start_offset,
            speechEndOffset=speech_end_offset,
            waveform=waveform_data,
        )

        if text != BLANK_AUDIO_TOKEN:
            alerts = self.alert_evaluator.evaluate(text)
            if alerts:
                transcription.alerts = alerts

        await self.database.append_transcription(transcription)
        await self.on_transcription(transcription)

    def _should_emit_blank_audio(self, samples: np.ndarray) -> bool:
        duration = samples.size / self.sample_rate
        if duration < self._blank_audio_min_duration:
            return False
        rms = float(np.sqrt(np.mean(np.square(samples)))) if samples.size else 0.0
        if not np.isfinite(rms) or rms < self._blank_audio_min_rms:
            return False
        active_ratio = float(np.mean(np.abs(samples) > self._silence_threshold))
        if active_ratio < self._blank_audio_min_active_ratio:
            return False
        return True

    @staticmethod
    def _prepare_hallucination_phrases(
        phrases: Iterable[str], initial_prompt: Optional[str] = None
    ) -> Set[str]:
        prepared: Set[str] = set()
        for phrase in phrases:
            if not phrase:
                continue
            normalized = StreamWorker._normalize_hallucination_phrase(phrase)
            if normalized:
                prepared.add(normalized)
        for prompt_phrase in StreamWorker._extract_initial_prompt_phrases(
            initial_prompt
        ):
            normalized = StreamWorker._normalize_hallucination_phrase(prompt_phrase)
            if normalized:
                prepared.add(normalized)
        return prepared

    @staticmethod
    def _prepare_advertisement_phrases(phrases: Iterable[str]) -> Set[str]:
        """Prepare advertisement filter phrases for matching."""
        prepared: Set[str] = set()
        for phrase in phrases:
            if not phrase:
                continue
            normalized = StreamWorker._normalize_hallucination_phrase(phrase)
            if normalized:
                prepared.add(normalized)
        return prepared

    def _is_advertisement(self, text: str) -> bool:
        """Check if transcription text matches an advertisement phrase."""
        if not self._advertisement_phrases:
            return False
        normalized = self._normalize_hallucination_phrase(text)
        if not normalized:
            return False
        for phrase in self._advertisement_phrases:
            if phrase in normalized:
                return True
        return False

    @staticmethod
    def _normalize_hallucination_phrase(text: str) -> str:
        lowered = text.strip().lower()
        if not lowered:
            return ""
        normalized_chars: List[str] = []
        for char in lowered:
            if char.isalnum():
                normalized_chars.append(char)
            elif char.isspace():
                normalized_chars.append(" ")
        if not normalized_chars:
            return ""
        normalized = "".join(normalized_chars)
        return " ".join(normalized.split())

    @staticmethod
    def _extract_initial_prompt_phrases(
        initial_prompt: Optional[str],
    ) -> Tuple[str, ...]:
        if not initial_prompt:
            return ()
        collapsed = " ".join(initial_prompt.split())
        if not collapsed:
            return ()
        phrases: List[str] = [collapsed]
        for sentence in re.split(r"[.!?]+", collapsed):
            trimmed = sentence.strip()
            if trimmed:
                phrases.append(trimmed)
        unique_phrases = tuple(dict.fromkeys(phrases))
        return unique_phrases

    def _should_discard_hallucination(
        self,
        text: str,
        samples: np.ndarray,
        confidence: Optional[float],
        avg_logprob: Optional[float],
    ) -> bool:
        normalized = self._normalize_hallucination_phrase(text)
        if not normalized:
            return False
        # Extreme repetitions (10+ consecutive) are always hallucinations,
        # regardless of audio energy level. No real speech repeats this much.
        if self._has_extreme_repetition(normalized):
            return True
        if self._has_repeated_hallucination_phrase(normalized):
            return True
        if not (
            self._matches_hallucination_phrase(normalized)
            or self._has_excessive_repetition(normalized)
        ):
            return False
        if self._is_mostly_silence(samples, confidence):
            return True
        return self._is_low_quality_transcription(avg_logprob)

    def _matches_hallucination_phrase(self, normalized_text: str) -> bool:
        return normalized_text in self._hallucination_phrases

    def _has_repeated_hallucination_phrase(self, normalized_text: str) -> bool:
        for phrase in self._hallucination_phrases:
            if self._is_repeated_phrase(normalized_text, phrase):
                return True
        return False

    @staticmethod
    def _is_repeated_phrase(normalized_text: str, phrase: str) -> bool:
        if not normalized_text or not phrase:
            return False
        if normalized_text == phrase:
            return False
        phrase_tokens = phrase.split()
        text_tokens = normalized_text.split()
        if not phrase_tokens or not text_tokens:
            return False
        phrase_length = len(phrase_tokens)
        # Need at least 2 full repetitions to count as repeated
        if len(text_tokens) < phrase_length * 2:
            return False
        # Count how many complete repetitions match
        full_reps = len(text_tokens) // phrase_length
        remainder = len(text_tokens) % phrase_length
        # Check all complete repetitions
        for rep in range(full_reps):
            start = rep * phrase_length
            for i, expected in enumerate(phrase_tokens):
                if text_tokens[start + i] != expected:
                    return False
        # Check partial repetition at the end (if any) - allow truncated final phrase
        for i in range(remainder):
            if text_tokens[full_reps * phrase_length + i] != phrase_tokens[i]:
                return False
        # Must have at least 3 repetitions (or 2 full + partial) to be a hallucination
        return full_reps >= 3 or (full_reps >= 2 and remainder > 0)

    @staticmethod
    def _has_excessive_repetition(normalized_text: str) -> bool:
        tokens = normalized_text.split()
        total_tokens = len(tokens)
        if total_tokens < 6:
            return False
        # Repetitive hallucinations often repeat longer phrases verbatim.
        # Allow n-gram windows beyond short phrases so we can catch patterns like
        # "if you want to go ahead and see" which Whisper occasionally loops.
        max_ngram = min(12, total_tokens // 2)
        for ngram_size in range(1, max_ngram + 1):
            min_repetitions = 6 if ngram_size == 1 else 3
            required_tokens = ngram_size * min_repetitions
            if total_tokens < ngram_size * 2:
                continue
            for start in range(0, total_tokens - ngram_size + 1):
                base = tokens[start : start + ngram_size]
                if not all(base):
                    continue
                repetitions = 1
                index = start + ngram_size
                while index + ngram_size <= total_tokens and tokens[
                    index : index + ngram_size
                ] == base:
                    repetitions += 1
                    index += ngram_size
                if repetitions < 2:
                    continue
                covered_tokens = repetitions * ngram_size
                coverage_ratio = covered_tokens / total_tokens
                coverage_threshold = max(total_tokens * 0.6, required_tokens)
                if repetitions >= min_repetitions and covered_tokens >= coverage_threshold:
                    return True
                if (
                    ngram_size > 1
                    and repetitions >= 2
                    and coverage_ratio >= 0.8
                    and covered_tokens >= ngram_size * 2
                ):
                    return True
        return False

    @staticmethod
    def _has_extreme_repetition(normalized_text: str) -> bool:
        """Detect extreme repetition (10+ identical phrases) that are always hallucinations.

        Unlike _has_excessive_repetition which requires low-energy audio to discard,
        extreme repetitions (10+ consecutive repeats) are unconditionally discarded
        because no real speech contains phrases repeated this many times.
        """
        tokens = normalized_text.split()
        total_tokens = len(tokens)
        if total_tokens < 10:  # Need at least 10 tokens for 10 single-word repeats
            return False
        # Check n-gram repetitions up to 8 words to catch longer phrase hallucinations
        # like "I'm not sure what you're doing" repeated 10+ times
        max_ngram = min(8, total_tokens // 10)  # Need at least 10 repeats
        for ngram_size in range(1, max_ngram + 1):
            min_tokens_needed = ngram_size * 10
            if total_tokens < min_tokens_needed:
                continue
            for start in range(total_tokens - ngram_size * 2 + 1):
                base = tokens[start : start + ngram_size]
                if not all(base):
                    continue
                repetitions = 1
                idx = start + ngram_size
                while idx + ngram_size <= total_tokens and tokens[
                    idx : idx + ngram_size
                ] == base:
                    repetitions += 1
                    idx += ngram_size
                if repetitions >= 10:
                    return True
        return False

    def _contains_repetitive_segment_text(
        self, segments: Iterable[TranscriptionSegment]
    ) -> bool:
        min_chars = self._segment_repetition_min_chars
        max_allowed_repeats = self._segment_repetition_max_allowed_repeats
        if (
            min_chars is None
            or max_allowed_repeats is None
            or max_allowed_repeats <= 0
        ):
            return False
        for segment in segments:
            if self._segment_has_excessive_repetition(
                segment.text, min_chars, max_allowed_repeats
            ):
                return True
        return False

    @staticmethod
    def _segment_has_excessive_repetition(
        text: str, min_chars: int, max_allowed_repeats: int
    ) -> bool:
        if max_allowed_repeats <= 0:
            return False
        normalized = " ".join(text.split())
        if len(normalized) < min_chars:
            return False
        searchable = normalized + " "
        pattern = StreamWorker._build_repetition_pattern(
            min_chars, max_allowed_repeats
        )
        return bool(pattern.search(searchable))

    @staticmethod
    @lru_cache(maxsize=256)
    def _build_repetition_pattern(
        min_chars: int, max_allowed_repeats: int
    ) -> Pattern[str]:
        return re.compile(
            rf"(.{{{min_chars},}}?)" rf"\1{{{max_allowed_repeats},}}"
        )

    def _is_mostly_silence(
        self, samples: np.ndarray, confidence: Optional[float]
    ) -> bool:
        if samples.size == 0:
            return True
        if self._is_low_energy(samples):
            return True
        active_ratio = float(np.mean(np.abs(samples) > self._silence_threshold))
        if active_ratio < self._active_ratio_threshold:
            return True
        if confidence is not None and confidence < 0.4:
            return True
        return False

    def _is_low_energy(self, samples: np.ndarray) -> bool:
        if samples.size == 0:
            return True
        float_samples = samples.astype(np.float64, copy=False)
        amplitudes = np.abs(float_samples)
        if amplitudes.size == 0:
            return True
        peak = float(np.max(amplitudes))
        if not np.isfinite(peak):
            return True
        if peak >= self._low_energy_peak_threshold:
            return False
        rms = float(np.sqrt(np.mean(np.square(float_samples))))
        if not np.isfinite(rms):
            return True
        if rms >= self._low_energy_rms_threshold:
            return False
        return True

    @staticmethod
    def _is_low_quality_transcription(avg_logprob: Optional[float]) -> bool:
        if avg_logprob is None:
            return False
        return avg_logprob < -0.7

    @staticmethod
    def _is_punctuation_only(text: str) -> bool:
        stripped = text.strip()
        if not stripped:
            return True
        allowed = " .,!?:;'-\"()[]{}“”’…"
        return all(char in allowed for char in stripped)

    def _trim_leading_silence(
        self, samples: np.ndarray, prefix_samples: int
    ) -> Tuple[np.ndarray, int]:
        """Trim leading silence, but never into the body region.

        Only remove silence that falls within the carried-over prefix context;
        do not trim into the new body audio. This prevents clipping the very
        start of recordings when the first syllables begin softly.

        Returns (trimmed_samples, trimmed_count).
        """
        if samples.size == 0:
            return samples, 0
        if self._silence_threshold <= 0.0:
            return samples, 0
        active_indices = np.flatnonzero(np.abs(samples) > self._silence_threshold)
        if active_indices.size == 0:
            return samples, 0
        first_active = int(active_indices[0])
        if first_active <= 0:
            return samples, 0
        # If there is a carried prefix, allow trimming into the silent region
        # up to the first active sample while retaining a short leading gap to
        # preserve cadence between adjacent recordings.
        # Keep at most ~2 seconds when a prefix exists, otherwise (no prefix)
        # remove all pure leading silence up to the first active sample.
        if int(prefix_samples) > 0:
            keep_seconds = 2.0
            keep_limit = min(int(prefix_samples), int(round(keep_seconds * self.sample_rate)))
            trim_index = max(0, first_active - keep_limit)
        else:
            trim_index = first_active
        if trim_index <= 0:
            return samples, 0
        return samples[trim_index:].copy(), trim_index

    async def _write_recording(self, samples: np.ndarray) -> Path:
        file_name = f"stream-{self.stream.id}-{int(utcnow().timestamp()*1000)}.wav"
        file_path = RECORDINGS_DIR / file_name
        await asyncio.to_thread(sf.write, file_path, samples, self.sample_rate)
        return file_path

    def _prepare_transcription_audio(self, samples: np.ndarray) -> np.ndarray:
        if samples.size == 0:
            return samples
        return self._audio_frontend.process(samples, target_rms=self._agc_target_rms)
