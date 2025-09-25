"""Handles ingestion and transcription for a single stream."""

from __future__ import annotations

import asyncio
import logging
import re
import struct
import uuid
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import (
    AsyncIterator,
    Awaitable,
    Callable,
    Deque,
    Iterable,
    List,
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
from .models import (
    Stream,
    StreamStatus,
    TranscriptionResult,
    TranscriptionSegment,
    WhisperConfig,
)
from .state_paths import RECORDINGS_DIR
from .stream_defaults import resolve_ignore_first_seconds
from .transcription_postprocessor import PhraseCanonicalizer
from .transcription_executor import TranscriptionExecutor
from .whisper_transcriber import AbstractTranscriber, TranscriptionResultBundle

BLANK_AUDIO_TOKEN = "[BLANK_AUDIO]"
UNABLE_TO_TRANSCRIBE_TOKEN = "[unable to transcribe]"

RECONNECT_BACKOFF_SECONDS = 600.0


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
            Callable[[Stream, int, float], Awaitable[None]]
        ] = None,
        on_upstream_reconnect: Optional[
            Callable[[Stream, int], Awaitable[None]]
        ] = None,
        *,
        config: WhisperConfig,
        transcription_executor: Optional[TranscriptionExecutor] = None,
    ) -> None:
        self.stream = stream
        self.transcriber = transcriber
        self._transcription_executor = transcription_executor
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
        self._hallucination_phrases = self._prepare_hallucination_phrases(
            config.silenceHallucinationPhrases,
            config.initialPrompt,
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

        self._live_audio_lock = asyncio.Lock()
        self._live_audio_listeners: Set[_LiveAudioListener] = set()
        self._live_audio_header = self._build_wav_header(self.sample_rate)

        self._task: Optional[asyncio.Task[None]] = None
        self._stop_event = asyncio.Event()
        self._chunk_queue: Optional[asyncio.Queue[Optional[PreparedChunk]]] = None
        self._worker_tasks: List[asyncio.Task[None]] = []
        self._worker_failure: Optional[BaseException] = None
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

    async def _unregister_live_audio_listener(
        self, listener: _LiveAudioListener
    ) -> None:
        async with self._live_audio_lock:
            self._live_audio_listeners.discard(listener)

    async def _broadcast_live_audio(self, pcm_bytes: bytes) -> None:
        if not pcm_bytes:
            return
        async with self._live_audio_lock:
            listeners = tuple(self._live_audio_listeners)
        if not listeners:
            return
        for listener in listeners:
            listener.feed(pcm_bytes)

    async def _shutdown_live_audio(self) -> None:
        async with self._live_audio_lock:
            listeners = tuple(self._live_audio_listeners)
            self._live_audio_listeners.clear()
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
                await queue.join()
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
                        "-loglevel",
                        "warning",
                        "-i",
                        self.stream.url,
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
                                self.stream, attempt_number, delay_seconds
                            )
                            session_should_reconnect = True
                            break
                        next_reconnect_attempt = 0
                        if not self._upstream_connected:
                            attempt_value = self._pending_reconnect_attempt or 1
                            self._upstream_connected = True
                            self._pending_reconnect_attempt = None
                            await self.on_upstream_reconnect(
                                self.stream, attempt_value
                            )
                        await self._ingest_pcm_bytes(chunk)
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
                                await process.wait()
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
                        self.stream, attempt_number, delay_seconds
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
            await self._shutdown_transcription_workers(flush=not worker_failed)
        if worker_failure is not None:
            raise worker_failure

    def _reconnect_delay_seconds(self, attempt: int) -> float:
        if attempt <= 1:
            return 0.0
        return RECONNECT_BACKOFF_SECONDS

    async def _wait_before_reconnect(self, attempt: int) -> bool:
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

    async def _ingest_pcm_bytes(self, pcm_bytes: bytes) -> None:
        if not pcm_bytes:
            return
        total_samples = len(pcm_bytes) // 2
        if total_samples <= 0:
            return
        trimmed_bytes = pcm_bytes
        if self._ignore_initial_samples:
            if total_samples <= self._ignore_initial_samples:
                self._ignore_initial_samples -= total_samples
                return
            skip_samples = self._ignore_initial_samples
            skip_bytes = skip_samples * 2
            trimmed_bytes = pcm_bytes[skip_bytes:]
            self._ignore_initial_samples = 0
        if len(trimmed_bytes) % 2 == 1:
            trimmed_bytes = trimmed_bytes[:-1]
        if len(trimmed_bytes) < 2:
            return
        await self._broadcast_live_audio(trimmed_bytes)
        samples = (
            np.frombuffer(trimmed_bytes, dtype=np.int16).astype(np.float32) / 32768.0
        )
        if samples.size == 0:
            return
        chunks = self._chunker.add_samples(samples)
        if not chunks:
            return
        if self._chunk_queue is None:
            for chunk in chunks:
                await self._transcribe_chunk(chunk)
            return
        for chunk in chunks:
            await self._chunk_queue.put(chunk)

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
            except Exception as exc:  # pylint: disable=broad-except
                if self._worker_failure is None:
                    self._worker_failure = exc
                self._stop_event.set()
                queue.task_done()
                raise
            else:
                queue.task_done()

    async def _run_transcription(
        self, audio: np.ndarray, sample_rate: int, language: Optional[str]
    ) -> TranscriptionResultBundle:
        executor = self._transcription_executor
        if executor is not None and self._blocking_supported is not False:
            blocking_method = getattr(self.transcriber, "transcribe_blocking", None)
            if blocking_method is not None:
                try:
                    result = await executor.run(
                        lambda: blocking_method(audio, sample_rate, language)
                    )
                except NotImplementedError:
                    self._blocking_supported = False
                else:
                    self._blocking_supported = True
                    return result
            else:
                self._blocking_supported = False
        return await self.transcriber.transcribe(audio, sample_rate, language)

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

        if text and self._is_punctuation_only(text):
            text = ""
            segments = []

        confidence: Optional[float] = None
        if bundle.no_speech_prob is not None:
            confidence = float(max(0.0, min(1.0, 1.0 - bundle.no_speech_prob)))

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

        if not text:
            if self._should_emit_blank_audio(effective_samples):
                text = BLANK_AUDIO_TOKEN
                segments = []
            elif self._is_mostly_silence(effective_samples, None):
                LOGGER.debug("Stream %s skipping silent chunk", self.stream.id)
                return
            else:
                text = UNABLE_TO_TRANSCRIBE_TOKEN
                segments = []

        trimmed_samples, trimmed_count = self._trim_leading_silence(chunk.samples)
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
        if text != BLANK_AUDIO_TOKEN:
            recording_file = await self._write_recording(trimmed_samples)
        duration = float(
            effective_duration
            if effective_duration > 0
            else trimmed_samples.size / self.sample_rate
        )
        recording_start_offset = (
            start_offset_seconds
            if recording_file is not None and start_offset_seconds > 0
            else None
        )

        transcription = TranscriptionResult(
            id=str(uuid.uuid4()),
            streamId=self.stream.id,
            text=text,
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
        if not (
            self._matches_hallucination_phrase(normalized)
            or self._has_excessive_repetition(normalized)
        ):
            return False
        if self._is_mostly_silence(samples, confidence):
            return True
        return self._is_low_quality_transcription(avg_logprob)

    def _matches_hallucination_phrase(self, normalized_text: str) -> bool:
        if normalized_text in self._hallucination_phrases:
            return True
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
        if len(text_tokens) <= phrase_length or len(text_tokens) % phrase_length != 0:
            return False
        for index, token in enumerate(text_tokens):
            if token != phrase_tokens[index % phrase_length]:
                return False
        return True

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

    def _is_mostly_silence(
        self, samples: np.ndarray, confidence: Optional[float]
    ) -> bool:
        if samples.size == 0:
            return True
        active_ratio = float(np.mean(np.abs(samples) > self._silence_threshold))
        if active_ratio < self._active_ratio_threshold:
            return True
        if confidence is not None and confidence < 0.4:
            return True
        return False

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

    def _trim_leading_silence(self, samples: np.ndarray) -> Tuple[np.ndarray, int]:
        if samples.size == 0:
            return samples, 0
        if self._silence_threshold <= 0.0:
            return samples, 0
        active_indices = np.flatnonzero(np.abs(samples) > self._silence_threshold)
        if active_indices.size == 0:
            return samples, 0
        trim_index = int(active_indices[0])
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
