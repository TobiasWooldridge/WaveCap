import asyncio
from collections import deque
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from typing import List

import numpy as np
import pytest
import soundfile as sf

import wavecap_backend.stream_worker as stream_worker_module

from wavecap_backend.alerts import TranscriptionAlertEvaluator
from wavecap_backend.database import StreamDatabase
from wavecap_backend.models import (
    AlertsConfig,
    Stream,
    StreamSource,
    StreamStatus,
    TranscriptionSegment,
    TranscriptionResult,
    WhisperConfig,
)
from wavecap_backend.stream_defaults import BROADCASTIFY_PREROLL_SECONDS
from wavecap_backend.stream_worker import (
    BLANK_AUDIO_TOKEN,
    ChunkAccumulator,
    PreparedChunk,
    RECONNECT_BACKOFF_SECONDS,
    StreamWorker,
    UNABLE_TO_TRANSCRIBE_TOKEN,
)
from wavecap_backend.transcription_executor import TranscriptionExecutor
from wavecap_backend.whisper_transcriber import (
    AbstractTranscriber,
    TranscriptionResultBundle,
)


class StubTranscriber(AbstractTranscriber):
    def __init__(self, bundles: List[TranscriptionResultBundle]):
        self._bundles = bundles
        self.calls: List[np.ndarray] = []

    async def transcribe(self, audio: np.ndarray, sample_rate: int, language):
        self.calls.append(audio)
        if not self._bundles:
            raise AssertionError("No transcription bundles configured")
        return self._bundles.pop(0)


class BlockingTranscriber(AbstractTranscriber):
    def __init__(self, bundle: TranscriptionResultBundle):
        self._bundle = bundle
        self.started = asyncio.Event()
        self.released = asyncio.Event()
        self.finished = asyncio.Event()
        self.calls: List[np.ndarray] = []

    async def transcribe(self, audio: np.ndarray, sample_rate: int, language):
        self.calls.append(audio)
        self.started.set()
        await self.released.wait()
        self.finished.set()
        return self._bundle


@pytest.mark.asyncio
async def test_chunk_accumulator_flushes_on_silence(tmp_path):
    chunker = ChunkAccumulator(
        sample_rate=16000,
        max_chunk_seconds=10,
        min_chunk_seconds=1,
        context_seconds=0,
        silence_threshold=0.01,
        silence_lookback_seconds=0.25,
        silence_hold_seconds=0.25,
        active_ratio_threshold=0.1,
    )

    tone = np.full(16000, 1000, dtype=np.float32) / 32768.0
    silence = np.zeros(16000, dtype=np.float32)

    chunks = chunker.add_samples(tone)
    assert chunks == []
    chunks = chunker.add_samples(tone)
    assert chunks == []
    chunks = chunker.add_samples(silence)
    assert len(chunks) == 1

    chunk = chunks[0]
    assert pytest.approx(chunk.samples.size, rel=0.01) == 16000 * 3
    assert chunk.prefix_samples == 0


@pytest.mark.asyncio
async def test_worker_emits_transcription_after_silence(tmp_path):
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=6,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
    )

    segment = TranscriptionSegment(
        id=0,
        text="hello world",
        no_speech_prob=0.1,
        temperature=0.0,
        avg_logprob=-0.1,
        compression_ratio=1.0,
        start=0.0,
        end=2.5,
        seek=0,
    )
    bundle = TranscriptionResultBundle(
        "hello world", [segment], "en", no_speech_prob=0.1
    )
    transcriber = StubTranscriber([bundle])

    stream = Stream(
        id="stream-1",
        name="Example",
        url="http://example.com/audio",
        status=StreamStatus.STOPPED,
        createdAt=datetime.utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
    )

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(transcription: TranscriptionResult) -> None:
        captured.append(transcription)

    async def noop_status(_stream: Stream, _status: StreamStatus) -> None:
        return

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=noop_status,
        config=config,
    )

    tone = (np.full(16000, 1200, dtype=np.int16)).tobytes()
    silence = np.zeros(16000, dtype=np.int16).tobytes()

    await worker._ingest_pcm_bytes(tone)
    assert captured == []
    await worker._ingest_pcm_bytes(tone)
    assert captured == []
    await worker._ingest_pcm_bytes(silence)
    assert len(captured) == 1

    result = captured[0]
    assert result.text == "hello world"
    assert result.recordingStartOffset is None
    assert result.duration > 2.5
    assert result.segments and result.segments[0].text == "hello world"
    assert len(transcriber.calls) == 1


@pytest.mark.asyncio
async def test_worker_falls_back_when_blocking_not_supported(tmp_path):
    executor = TranscriptionExecutor(worker_count=1, queue_size=4)
    await executor.start()

    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=6,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
    )

    bundle = TranscriptionResultBundle("fallback", [], "en")
    transcriber = StubTranscriber([bundle])

    stream = Stream(
        id="stream-1",
        name="Example",
        url="http://example.com/audio",
        status=StreamStatus.STOPPED,
        createdAt=datetime.utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
        language="en",
    )

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))

    async def noop_transcription(_transcription: TranscriptionResult) -> None:
        return

    async def noop_status(_stream: Stream, _status: StreamStatus) -> None:
        return

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        transcription_executor=executor,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=noop_transcription,
        on_status_change=noop_status,
        config=config,
    )

    audio = np.zeros(16000, dtype=np.float32)
    try:
        result = await worker._run_transcription(audio, worker.sample_rate, stream.language)
    finally:
        await executor.close()

    assert result.text == "fallback"
    assert worker._blocking_supported is False
    assert len(transcriber.calls) == 1


@pytest.mark.asyncio
async def test_worker_canonicalizes_domain_phrases(tmp_path):
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=6,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
    )

    raw_text = "adel aide fire out near norlunga"
    segment = TranscriptionSegment(
        id=0,
        text=raw_text,
        no_speech_prob=0.1,
        temperature=0.0,
        avg_logprob=-0.1,
        compression_ratio=1.0,
        start=0.0,
        end=2.5,
        seek=0,
    )
    bundle = TranscriptionResultBundle(raw_text, [segment], "en", no_speech_prob=0.1)
    transcriber = StubTranscriber([bundle])

    stream = Stream(
        id="stream-phrases",
        name="Example",
        url="http://example.com/audio",
        status=StreamStatus.STOPPED,
        createdAt=datetime.utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
    )

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(transcription: TranscriptionResult) -> None:
        captured.append(transcription)

    async def noop_status(_stream: Stream, _status: StreamStatus) -> None:
        return

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=noop_status,
        config=config,
    )

    tone = (np.full(16000, 1200, dtype=np.int16)).tobytes()
    silence = np.zeros(16000, dtype=np.int16).tobytes()

    await worker._ingest_pcm_bytes(tone)
    await worker._ingest_pcm_bytes(silence)

    assert len(captured) == 1
    result = captured[0]
    assert "Adelaide fire out" in result.text
    assert "Noarlunga" in result.text
    assert result.segments
    assert "Adelaide fire out" in result.segments[0].text


@pytest.mark.asyncio
async def test_worker_ingest_runs_asynchronously(tmp_path):
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=1,
        minChunkDurationSeconds=0.5,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
    )

    bundle = TranscriptionResultBundle("blocking", [], "en", no_speech_prob=0.1)
    transcriber = BlockingTranscriber(bundle)

    stream = Stream(
        id="stream-async",
        name="Async",
        url="http://example.com/audio",
        status=StreamStatus.STOPPED,
        createdAt=datetime.utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
    )

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(transcription: TranscriptionResult) -> None:
        captured.append(transcription)

    async def noop_status(_stream: Stream, _status: StreamStatus) -> None:
        return

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=noop_status,
        config=config,
    )

    worker._start_transcription_workers()
    tone = (np.full(16000, 1600, dtype=np.int16)).tobytes()

    try:
        await worker._ingest_pcm_bytes(tone)
        await asyncio.wait_for(transcriber.started.wait(), timeout=1)
        assert not transcriber.finished.is_set()
        assert captured == []
        transcriber.released.set()
        await asyncio.wait_for(transcriber.finished.wait(), timeout=1)
    finally:
        transcriber.released.set()
        await worker._shutdown_transcription_workers(flush=True)

    assert len(captured) == 1
    assert captured[0].text == "blocking"
    assert len(transcriber.calls) == 1


class HangingStdout:
    def __init__(self) -> None:
        self.cancelled = asyncio.Event()
        self.read_calls = 0

    async def read(self, _size: int) -> bytes:
        self.read_calls += 1
        try:
            await asyncio.sleep(60)
        except asyncio.CancelledError:
            self.cancelled.set()
            raise
        return b""


class DummyProcess:
    def __init__(self) -> None:
        self.stdout = HangingStdout()
        self.stderr = None
        self.returncode: int | None = None
        self.terminate_called = False
        self.kill_called = False

    def terminate(self) -> None:
        self.terminate_called = True
        self.returncode = 0

    def kill(self) -> None:
        self.kill_called = True
        self.returncode = -9

    async def wait(self) -> int:
        return self.returncode or 0


@pytest.mark.asyncio
async def test_worker_stop_terminates_hanging_ffmpeg(monkeypatch, tmp_path):
    process = DummyProcess()

    async def fake_create_subprocess_exec(*_args, **_kwargs):
        return process

    monkeypatch.setattr(
        stream_worker_module.asyncio,
        "create_subprocess_exec",
        fake_create_subprocess_exec,
    )

    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=4,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
    )

    stream = Stream(
        id="stream-hang",
        name="Hanging Stream",
        url="http://example.com/audio",
        status=StreamStatus.STOPPED,
        createdAt=datetime.utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
    )

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))

    status_updates: list[StreamStatus] = []
    stopped_event = asyncio.Event()

    async def capture(_transcription: TranscriptionResult) -> None:
        return

    async def track_status(_stream: Stream, status: StreamStatus) -> None:
        status_updates.append(status)
        if status == StreamStatus.STOPPED:
            stopped_event.set()

    worker = StreamWorker(
        stream=stream,
        transcriber=StubTranscriber([]),
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=track_status,
        config=config,
    )

    worker.start()
    await asyncio.sleep(0)

    await asyncio.wait_for(worker.stop(), timeout=5)
    await asyncio.wait_for(stopped_event.wait(), timeout=1)

    assert process.terminate_called
    assert not process.kill_called
    assert process.stdout.read_calls >= 1
    assert process.stdout.cancelled.is_set()
    assert status_updates[-1] == StreamStatus.STOPPED


@pytest.mark.asyncio
async def test_worker_emits_blank_audio_placeholder(tmp_path):
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=4,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
        blankAudioMinDurationSeconds=0.5,
        blankAudioMinActiveRatio=0.05,
        blankAudioMinRms=0.005,
    )

    bundle = TranscriptionResultBundle("", [], "en", no_speech_prob=0.6)
    transcriber = StubTranscriber([bundle])

    stream = Stream(
        id="stream-blank",
        name="Silence",
        url="http://example.com/audio",
        status=StreamStatus.STOPPED,
        createdAt=datetime.utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
    )

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(transcription: TranscriptionResult) -> None:
        captured.append(transcription)

    async def noop_status(_stream: Stream, _status: StreamStatus) -> None:
        return

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=noop_status,
        config=config,
    )

    tone = (np.full(16000, 1800, dtype=np.int16)).tobytes()
    silence = np.zeros(16000, dtype=np.int16).tobytes()

    await worker._ingest_pcm_bytes(tone)
    await worker._ingest_pcm_bytes(silence)

    assert len(captured) == 1


@pytest.mark.asyncio
async def test_worker_preserves_untranscribed_audio(tmp_path, monkeypatch):
    recordings_root = tmp_path / "recordings"
    monkeypatch.setattr(stream_worker_module, "RECORDINGS_DIR", recordings_root)

    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=4,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
        blankAudioMinDurationSeconds=0.5,
        blankAudioMinActiveRatio=0.5,
        blankAudioMinRms=0.1,
    )

    bundle = TranscriptionResultBundle("", [], "en", no_speech_prob=0.9)
    transcriber = StubTranscriber([bundle])

    stream = Stream(
        id="stream-untranscribed",
        name="Noisy",
        url="http://example.com/audio",
        status=StreamStatus.STOPPED,
        createdAt=datetime.utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
    )

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(transcription: TranscriptionResult) -> None:
        captured.append(transcription)

    async def noop_status(_stream: Stream, _status: StreamStatus) -> None:
        return

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=noop_status,
        config=config,
    )

    rng = np.random.default_rng(12345)
    noise = rng.integers(-4000, 4000, size=16000, dtype=np.int16).tobytes()
    silence = np.zeros(16000, dtype=np.int16).tobytes()

    await worker._ingest_pcm_bytes(noise)
    await worker._ingest_pcm_bytes(silence)

    assert len(captured) == 1
    transcription = captured[0]
    assert transcription.text == UNABLE_TO_TRANSCRIBE_TOKEN
    assert not transcription.segments
    assert transcription.recordingUrl is not None
    assert transcription.recordingUrl.startswith("/recordings/")

    file_name = transcription.recordingUrl.split("/")[-1]
    recording_path = recordings_root / file_name
    assert recording_path.exists()


@pytest.mark.asyncio
async def test_worker_boosts_quiet_audio_before_transcription(tmp_path):
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=4,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.0,
        silenceThreshold=0.02,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
    )

    segment = TranscriptionSegment(
        id=0,
        text="quiet speech",
        no_speech_prob=0.1,
        temperature=0.0,
        avg_logprob=-0.1,
        compression_ratio=1.0,
        start=0.0,
        end=1.0,
        seek=0,
    )
    bundle = TranscriptionResultBundle(
        "quiet speech", [segment], "en", no_speech_prob=0.1
    )
    transcriber = StubTranscriber([bundle])

    stream = Stream(
        id="stream-quiet",
        name="Quiet Stream",
        url="http://example.com/audio",
        status=StreamStatus.STOPPED,
        createdAt=datetime.utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
    )

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))

    async def noop_status(_stream: Stream, _status: StreamStatus) -> None:
        return

    async def noop_transcription(_transcription: TranscriptionResult) -> None:
        return

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=noop_transcription,
        on_status_change=noop_status,
        config=config,
    )

    t = np.arange(16000, dtype=np.float32) / 16000.0
    raw_float = 0.002 * np.sin(2.0 * np.pi * 400.0 * t)
    quiet_pcm = (raw_float * 32768.0).astype(np.int16).tobytes()
    original_rms = float(np.sqrt(np.mean(np.square(raw_float))))

    await worker._ingest_pcm_bytes(quiet_pcm)
    await worker._flush_pending_chunks()

    assert len(transcriber.calls) == 1
    boosted_rms = float(np.sqrt(np.mean(np.square(transcriber.calls[0]))))

    target_rms = max(config.silenceThreshold * 2.0, 0.01)
    assert boosted_rms > original_rms
    max_gain = worker._audio_frontend._config.agc_max_gain  # type: ignore[attr-defined]
    expected_rms = min(target_rms, original_rms * max_gain)
    assert boosted_rms == pytest.approx(expected_rms, rel=0.35)


@pytest.mark.asyncio
async def test_worker_respects_context_offset(tmp_path):
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=6,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.5,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
    )

    first_segment = TranscriptionSegment(
        id=0,
        text="first chunk",
        no_speech_prob=0.1,
        temperature=0.0,
        avg_logprob=-0.1,
        compression_ratio=1.0,
        start=0.0,
        end=2.0,
        seek=0,
    )
    bundle1 = TranscriptionResultBundle(
        "first chunk", [first_segment], "en", no_speech_prob=0.1
    )

    overlap_segment = TranscriptionSegment(
        id=1,
        text="old ",
        no_speech_prob=0.2,
        temperature=0.0,
        avg_logprob=-0.2,
        compression_ratio=1.0,
        start=0.0,
        end=0.4,
        seek=0,
    )
    new_segment = TranscriptionSegment(
        id=2,
        text="news",
        no_speech_prob=0.2,
        temperature=0.0,
        avg_logprob=-0.2,
        compression_ratio=1.0,
        start=0.4,
        end=1.1,
        seek=0,
    )
    bundle2 = TranscriptionResultBundle(
        "old news", [overlap_segment, new_segment], "en", no_speech_prob=0.3
    )

    transcriber = StubTranscriber([bundle1, bundle2])

    stream = Stream(
        id="stream-context",
        name="Context",
        url="http://example.com/audio",
        status=StreamStatus.STOPPED,
        createdAt=datetime.utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
    )

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(transcription: TranscriptionResult) -> None:
        captured.append(transcription)

    async def noop_status(_stream: Stream, _status: StreamStatus) -> None:
        return

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=noop_status,
        config=config,
    )

    tone = (np.full(16000, 2000, dtype=np.int16)).tobytes()
    silence = np.zeros(16000, dtype=np.int16).tobytes()

    await worker._ingest_pcm_bytes(tone)
    await worker._ingest_pcm_bytes(silence)
    await worker._ingest_pcm_bytes(tone)
    await worker._ingest_pcm_bytes(silence)

    assert len(captured) == 2
    latest = captured[-1]
    assert latest.text.strip() == "news"
    assert latest.recordingStartOffset is None
    assert latest.segments and pytest.approx(latest.segments[0].start, rel=0.1) == 0.0


@pytest.mark.asyncio
async def test_worker_ignores_initial_seconds(tmp_path):
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=4,
        minChunkDurationSeconds=0.5,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
    )

    segment = TranscriptionSegment(
        id=0,
        text="hello there",
        no_speech_prob=0.1,
        temperature=0.0,
        avg_logprob=-0.1,
        compression_ratio=1.0,
        start=0.0,
        end=1.0,
        seek=0,
    )
    bundle = TranscriptionResultBundle(
        "hello there", [segment], "en", no_speech_prob=0.1
    )
    transcriber = StubTranscriber([bundle])

    stream = Stream(
        id="stream-ignore",
        name="Ignore",
        url="http://example.com/audio",
        status=StreamStatus.STOPPED,
        createdAt=datetime.utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
        ignoreFirstSeconds=1.0,
    )

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(transcription: TranscriptionResult) -> None:
        captured.append(transcription)

    async def noop_status(_stream: Stream, _status: StreamStatus) -> None:
        return

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=noop_status,
        config=config,
    )

    tone = (np.full(16000, 1500, dtype=np.int16)).tobytes()
    silence = np.zeros(16000, dtype=np.int16).tobytes()

    await worker._ingest_pcm_bytes(tone)
    assert captured == []
    assert transcriber.calls == []

    await worker._ingest_pcm_bytes(tone)
    assert captured == []
    assert transcriber.calls == []

    await worker._ingest_pcm_bytes(silence)

    assert len(captured) == 1
    assert len(transcriber.calls) == 1
    result = captured[0]
    assert result.text == "hello there"
    assert result.duration > 0
    assert result.recordingUrl


@pytest.mark.asyncio
async def test_worker_applies_broadcastify_preroll(tmp_path):
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=4,
        minChunkDurationSeconds=0.5,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
    )

    segment = TranscriptionSegment(
        id=0,
        text="dispatch update",
        no_speech_prob=0.1,
        temperature=0.0,
        avg_logprob=-0.1,
        compression_ratio=1.0,
        start=0.0,
        end=1.0,
        seek=0,
    )
    bundle = TranscriptionResultBundle(
        "dispatch update", [segment], "en", no_speech_prob=0.1
    )
    transcriber = StubTranscriber([bundle])

    stream = Stream(
        id="stream-broadcastify",
        name="Broadcastify",
        url="https://broadcastify.example.com/stream",
        status=StreamStatus.STOPPED,
        createdAt=datetime.utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
        ignoreFirstSeconds=0.0,
    )

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(transcription: TranscriptionResult) -> None:
        captured.append(transcription)

    async def noop_status(_stream: Stream, _status: StreamStatus) -> None:
        return

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=noop_status,
        config=config,
    )

    tone = (np.full(16000, 1400, dtype=np.int16)).tobytes()
    silence = np.zeros(16000, dtype=np.int16).tobytes()

    for _ in range(int(BROADCASTIFY_PREROLL_SECONDS)):
        await worker._ingest_pcm_bytes(tone)

    assert captured == []
    assert transcriber.calls == []

    await worker._ingest_pcm_bytes(tone)
    await worker._ingest_pcm_bytes(silence)

    assert len(captured) == 1
    assert len(transcriber.calls) == 1
    assert captured[0].text == "dispatch update"


@pytest.mark.asyncio
async def test_worker_discards_hallucinated_silence(tmp_path):
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=4,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
        blankAudioMinDurationSeconds=0.5,
        blankAudioMinActiveRatio=0.0,
        blankAudioMinRms=0.0,
        silenceHallucinationPhrases=["thank you"],
    )

    bundle = TranscriptionResultBundle("Thank you.", [], "en", no_speech_prob=0.2)
    transcriber = StubTranscriber([bundle])

    stream = Stream(
        id="stream-hallucination",
        name="Hallucination",
        url="http://example.com/audio",
        status=StreamStatus.STOPPED,
        createdAt=datetime.utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
    )

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(transcription: TranscriptionResult) -> None:
        captured.append(transcription)

    async def noop_status(_stream: Stream, _status: StreamStatus) -> None:
        return

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=noop_status,
        config=config,
    )

    silence = np.zeros(16000, dtype=np.int16).tobytes()

    await worker._ingest_pcm_bytes(silence)

    assert len(captured) == 1
    result = captured[0]
    assert result.text == BLANK_AUDIO_TOKEN
    assert result.segments is None
    assert result.recordingUrl is None
    assert len(transcriber.calls) == 1


@pytest.mark.asyncio
async def test_worker_drops_low_energy_transcription(tmp_path):
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=4,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
        blankAudioMinDurationSeconds=0.5,
        blankAudioMinActiveRatio=0.0,
        blankAudioMinRms=0.02,
        silenceHallucinationPhrases=[],
    )

    bundle = TranscriptionResultBundle(
        "Noarlunga, Noarlunga, SITREP.",
        [],
        "en",
        no_speech_prob=0.3,
        avg_logprob=-1.2,
    )
    transcriber = StubTranscriber([bundle])

    stream = Stream(
        id="stream-low-energy-drop",
        name="Low energy",
        url="http://example.com/audio",
        status=StreamStatus.STOPPED,
        createdAt=datetime.utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
    )

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(transcription: TranscriptionResult) -> None:
        captured.append(transcription)

    async def noop_status(_stream: Stream, _status: StreamStatus) -> None:
        return

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=noop_status,
        config=config,
    )

    rng = np.random.default_rng(12345)
    noise = rng.normal(0.0, 0.002, 16000)
    pcm = np.clip(noise, -1.0, 1.0)
    samples = (np.round(pcm * 32767.0).astype(np.int16)).tobytes()

    await worker._ingest_pcm_bytes(samples)

    assert captured == []
    assert len(transcriber.calls) == 1


def test_prepare_hallucination_phrases_includes_initial_prompt() -> None:
    prompt = (
        "Priority callouts include Adelaide, Adelaide fire out, Noarlunga, and "
        "SITREP. Spell them exactly when they are heard on air."
    )
    phrases = StreamWorker._prepare_hallucination_phrases([], prompt)
    normalized_prompt = StreamWorker._normalize_hallucination_phrase(prompt)
    normalized_sentence = StreamWorker._normalize_hallucination_phrase(
        "Spell them exactly when they are heard on air"
    )
    assert normalized_prompt in phrases
    assert normalized_sentence in phrases


@pytest.mark.asyncio
async def test_worker_discards_all_right_here_we_go_hallucination(tmp_path):
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=4,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
        blankAudioMinDurationSeconds=0.5,
        blankAudioMinActiveRatio=0.0,
        blankAudioMinRms=0.0,
        silenceHallucinationPhrases=["all right here we go"],
    )

    bundle = TranscriptionResultBundle(
        "All right, here we go.", [], "en", no_speech_prob=0.2
    )
    transcriber = StubTranscriber([bundle])

    stream = Stream(
        id="stream-hallucination-all-right",
        name="Hallucination",
        url="http://example.com/audio",
        status=StreamStatus.STOPPED,
        createdAt=datetime.utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
    )

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(transcription: TranscriptionResult) -> None:
        captured.append(transcription)

    async def noop_status(_stream: Stream, _status: StreamStatus) -> None:
        return

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=noop_status,
        config=config,
    )

    silence = np.zeros(16000, dtype=np.int16).tobytes()

    await worker._ingest_pcm_bytes(silence)

    assert len(captured) == 1
    result = captured[0]
    assert result.text == BLANK_AUDIO_TOKEN
    assert result.segments is None
    assert result.recordingUrl is None
    assert len(transcriber.calls) == 1


@pytest.mark.asyncio
async def test_worker_discards_initial_prompt_hallucination(tmp_path):
    prompt = (
        "Priority callouts include Adelaide, Adelaide fire out, Noarlunga, and "
        "SITREP. Spell them exactly when they are heard on air."
    )
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=4,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
        blankAudioMinDurationSeconds=0.5,
        blankAudioMinActiveRatio=0.0,
        blankAudioMinRms=0.0,
        silenceHallucinationPhrases=[],
        initialPrompt=prompt,
    )

    bundle = TranscriptionResultBundle(prompt, [], "en", no_speech_prob=0.2)
    transcriber = StubTranscriber([bundle])

    stream = Stream(
        id="stream-hallucination-initial-prompt",
        name="Hallucination",
        url="http://example.com/audio",
        status=StreamStatus.STOPPED,
        createdAt=datetime.utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
    )

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(transcription: TranscriptionResult) -> None:
        captured.append(transcription)

    async def noop_status(_stream: Stream, _status: StreamStatus) -> None:
        return

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=noop_status,
        config=config,
    )

    silence = np.zeros(16000, dtype=np.int16).tobytes()

    await worker._ingest_pcm_bytes(silence)

    assert len(captured) == 1
    result = captured[0]
    assert result.text == BLANK_AUDIO_TOKEN
    assert result.segments is None
    assert result.recordingUrl is None
    assert len(transcriber.calls) == 1


@pytest.mark.asyncio
async def test_worker_discards_hallucination_with_low_logprob(tmp_path):
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=4,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
        blankAudioMinDurationSeconds=0.5,
        blankAudioMinActiveRatio=0.0,
        blankAudioMinRms=0.0,
        silenceHallucinationPhrases=["thank you"],
    )

    bundle = TranscriptionResultBundle(
        "Thank you.", [], "en", no_speech_prob=0.2, avg_logprob=-1.1
    )
    transcriber = StubTranscriber([bundle])

    stream = Stream(
        id="stream-hallucination-noisy",
        name="Hallucination",
        url="http://example.com/audio",
        status=StreamStatus.STOPPED,
        createdAt=datetime.utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
    )

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(transcription: TranscriptionResult) -> None:
        captured.append(transcription)

    async def noop_status(_stream: Stream, _status: StreamStatus) -> None:
        return

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=noop_status,
        config=config,
    )

    noisy = np.zeros(16000, dtype=np.int16)
    noisy[:4000] = 2000

    await worker._ingest_pcm_bytes(noisy.tobytes())

    assert len(captured) == 1
    result = captured[0]
    assert result.text == BLANK_AUDIO_TOKEN
    assert result.segments is None
    assert len(transcriber.calls) == 1


@pytest.mark.asyncio
async def test_worker_discards_repeated_hallucinated_phrase(tmp_path):
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=4,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
        blankAudioMinDurationSeconds=0.5,
        blankAudioMinActiveRatio=0.0,
        blankAudioMinRms=0.0,
        silenceHallucinationPhrases=["thank you"],
    )

    bundle = TranscriptionResultBundle(
        "Thank you, thank you.", [], "en", no_speech_prob=0.2
    )
    transcriber = StubTranscriber([bundle])

    stream = Stream(
        id="stream-hallucination-repeat",
        name="Hallucination",
        url="http://example.com/audio",
        status=StreamStatus.STOPPED,
        createdAt=datetime.utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
    )

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(transcription: TranscriptionResult) -> None:
        captured.append(transcription)

    async def noop_status(_stream: Stream, _status: StreamStatus) -> None:
        return

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=noop_status,
        config=config,
    )

    silence = np.zeros(16000, dtype=np.int16).tobytes()

    await worker._ingest_pcm_bytes(silence)

    assert len(captured) == 1
    result = captured[0]
    assert result.text == BLANK_AUDIO_TOKEN
    assert result.segments is None
    assert len(transcriber.calls) == 1


@pytest.mark.asyncio
async def test_worker_discards_double_repeat_hallucination(tmp_path):
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=4,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
        blankAudioMinDurationSeconds=0.5,
        blankAudioMinActiveRatio=0.0,
        blankAudioMinRms=0.0,
        silenceHallucinationPhrases=[],
    )

    bundle = TranscriptionResultBundle(
        "All right, let's go. All right, let's go.",
        [],
        "en",
        no_speech_prob=0.85,
    )
    transcriber = StubTranscriber([bundle])

    stream = Stream(
        id="stream-hallucination-double-repeat",
        name="Hallucination",
        url="http://example.com/audio",
        status=StreamStatus.STOPPED,
        createdAt=datetime.utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
    )

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(transcription: TranscriptionResult) -> None:
        captured.append(transcription)

    async def noop_status(_stream: Stream, _status: StreamStatus) -> None:
        return

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=noop_status,
        config=config,
    )

    silence = np.zeros(16000, dtype=np.int16).tobytes()

    await worker._ingest_pcm_bytes(silence)

    assert len(captured) == 1
    result = captured[0]
    assert result.text == BLANK_AUDIO_TOKEN
    assert result.segments is None
    assert len(transcriber.calls) == 1


@pytest.mark.asyncio
async def test_worker_discards_repetitive_silence_hallucination(tmp_path):
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=4,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
        blankAudioMinDurationSeconds=0.5,
        blankAudioMinActiveRatio=0.0,
        blankAudioMinRms=0.0,
        silenceHallucinationPhrases=[],
    )

    bundle = TranscriptionResultBundle(
        "All right, let's go ahead and go ahead and go ahead and go ahead.",
        [],
        "en",
        no_speech_prob=0.9,
    )
    transcriber = StubTranscriber([bundle])

    stream = Stream(
        id="stream-hallucination-repetitive",
        name="Hallucination",
        url="http://example.com/audio",
        status=StreamStatus.STOPPED,
        createdAt=datetime.utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
    )

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(transcription: TranscriptionResult) -> None:
        captured.append(transcription)

    async def noop_status(_stream: Stream, _status: StreamStatus) -> None:
        return

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=noop_status,
        config=config,
    )

    silence = np.zeros(16000, dtype=np.int16).tobytes()

    await worker._ingest_pcm_bytes(silence)

    assert len(captured) == 1
    result = captured[0]
    assert result.text == BLANK_AUDIO_TOKEN
    assert result.segments is None
    assert len(transcriber.calls) == 1


@pytest.mark.asyncio
async def test_worker_trims_leading_silence_from_recording(
    tmp_path, monkeypatch: pytest.MonkeyPatch
):
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=4,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
    )

    segment = TranscriptionSegment(
        id=0,
        text="leading",
        no_speech_prob=0.1,
        temperature=0.0,
        avg_logprob=-0.1,
        compression_ratio=1.0,
        start=0.5,
        end=1.5,
        seek=0,
    )
    bundle = TranscriptionResultBundle("leading", [segment], "en", no_speech_prob=0.1)
    transcriber = StubTranscriber([bundle])

    from wavecap_backend import state_paths
    from wavecap_backend import stream_worker as stream_worker_module

    monkeypatch.setattr(
        stream_worker_module, "RECORDINGS_DIR", state_paths.RECORDINGS_DIR
    )

    stream = Stream(
        id="stream-trim",
        name="Trim",
        url="http://example.com/audio",
        status=StreamStatus.STOPPED,
        createdAt=datetime.utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
    )

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(transcription: TranscriptionResult) -> None:
        captured.append(transcription)

    async def noop_status(_stream: Stream, _status: StreamStatus) -> None:
        return

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=noop_status,
        config=config,
    )

    silence = np.zeros(int(0.5 * worker.sample_rate), dtype=np.float32)
    tone = np.full(worker.sample_rate, 2000, dtype=np.float32) / 32768.0
    chunk_samples = np.concatenate((silence, tone))
    prepared = PreparedChunk(samples=chunk_samples, prefix_samples=0)

    await worker._transcribe_chunk(prepared)

    assert len(captured) == 1
    result = captured[0]
    assert result.recordingStartOffset is None
    assert result.segments and pytest.approx(result.segments[0].start, rel=0.05) == 0.0
    assert pytest.approx(result.segments[0].end, rel=0.05) == 1.0

    assert result.recordingUrl
    recording_path = (
        stream_worker_module.RECORDINGS_DIR / Path(result.recordingUrl).name
    )
    assert recording_path.exists()
    audio, sample_rate = sf.read(recording_path, dtype="float32")
    assert sample_rate == worker.sample_rate
    assert audio.size == tone.size
    assert float(np.abs(audio[0])) > config.silenceThreshold

    assert len(transcriber.calls) == 1


@pytest.mark.asyncio
async def test_worker_retains_phrase_when_audio_active(tmp_path):
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=4,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
        silenceHallucinationPhrases=["thank you"],
    )

    bundle = TranscriptionResultBundle("Thank you", [], "en", no_speech_prob=0.2)
    transcriber = StubTranscriber([bundle])

    stream = Stream(
        id="stream-active",
        name="Active",
        url="http://example.com/audio",
        status=StreamStatus.STOPPED,
        createdAt=datetime.utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
    )

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(transcription: TranscriptionResult) -> None:
        captured.append(transcription)

    async def noop_status(_stream: Stream, _status: StreamStatus) -> None:
        return

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=noop_status,
        config=config,
    )

    tone = (np.full(16000, 2000, dtype=np.int16)).tobytes()

    for _ in range(4):
        await worker._ingest_pcm_bytes(tone)

    assert len(captured) == 1
    result = captured[0]
    assert result.text == "Thank you"
    assert result.segments is None
    assert len(transcriber.calls) == 1


@pytest.mark.asyncio
async def test_worker_marks_repetitive_segment_as_untranscribable(tmp_path):
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=4,
        minChunkDurationSeconds=0.5,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
        segmentRepetitionMinCharacters=8,
        segmentRepetitionMaxAllowedConsecutiveRepeats=2,
    )

    segment_text = "Alpha Bravo Alpha Bravo Alpha Bravo"
    segment = TranscriptionSegment(
        id=0,
        text=segment_text,
        no_speech_prob=0.1,
        temperature=0.0,
        avg_logprob=-0.1,
        compression_ratio=1.0,
        start=0.0,
        end=1.5,
        seek=0,
    )
    bundle = TranscriptionResultBundle(segment_text, [segment], "en", no_speech_prob=0.1)
    transcriber = StubTranscriber([bundle])

    stream = Stream(
        id="stream-repetition",
        name="Repetition",
        url="http://example.com/audio",
        status=StreamStatus.STOPPED,
        createdAt=datetime.utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
    )

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(transcription: TranscriptionResult) -> None:
        captured.append(transcription)

    async def noop_status(_stream: Stream, _status: StreamStatus) -> None:
        return

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=noop_status,
        config=config,
    )

    tone = np.full(int(0.5 * worker.sample_rate), 4000, dtype=np.float32) / 32768.0
    prepared = PreparedChunk(samples=tone, prefix_samples=0)

    await worker._transcribe_chunk(prepared)

    assert len(captured) == 1
    result = captured[0]
    assert result.text == UNABLE_TO_TRANSCRIBE_TOKEN
    assert result.segments is None
    assert len(transcriber.calls) == 1


# fmt: off
THANK_YOU_ADELAIDE_LOOP = (
    "Thank you, Adelaide. Thank you. Thank you. Thank you. Thank you. Thank you, Adelaide. "
    "Thank you, Adelaide. Thank you, Adelaide. Thank you, Adelaide. Thank you, Adelaide. "
    "Thank you, Adelaide. Thank you, Adelaide. Thank you, Adelaide. Thank you, Adelaide. "
    "Thank you, Adelaide. Thank you, Adelaide. Thank you, Adelaide. Thank you, Adelaide. "
    "Thank you, Adelaide. Thank you, Adelaide. Thank you, Adelaide. Thank you, Adelaide. "
    "Thank you, Adelaide. Thank you, Adelaide. Thank you, Adelaide. Thank you, Adelaide. "
    "Thank you, Adelaide. Thank you, Adelaide. Thank you, Adelaide. Thank you, Adelaide. "
    "Thank you, Adelaide. Thank you, Adelaide."
)

YES_SIR_LOOP = (
    "Yes, sir. Yes, sir. Yes, sir. Yes, sir. Yes, sir. Yes, sir. Yes, sir. Yes, sir. "
    "Yes, sir. Yes, sir. Yes, sir. Yes, sir. Yes, sir. Yes, sir. Yes, sir. Yes, sir. "
    "Yes, sir. Yes, sir. Yes, sir. Yes, sir. Yes, sir. Yes, sir. Yes, sir. Yes, sir. "
    "Yes, sir. Yes, sir. Yes, sir. Yes, sir. Yes, sir. Yes, sir. Yes, sir. Yes, sir. "
    "Yes, sir. Yes, sir. Yes, sir. Yes, sir. Yes, sir. Yes, sir. Yes, sir. Yes, sir. "
    "Yes, sir. Yes, sir. Yes, sir. Yes, sir."
)
# fmt: on


@pytest.mark.parametrize(
    "text,min_chars,max_allowed_repeats,expected",
    [
        (
            "Alpha Bravo Alpha Bravo Alpha Bravo",
            8,
            2,
            True,
        ),
        ("Alpha Bravo", 8, 2, False),
        ("abcabcabcabc", 3, 3, True),
        ("abcabcabca", 3, 3, False),
        (THANK_YOU_ADELAIDE_LOOP, 8, 2, True),
        (YES_SIR_LOOP, 8, 2, True),
    ],
)
def test_segment_repetition_detection(text, min_chars, max_allowed_repeats, expected):
    assert (
        stream_worker_module.StreamWorker._segment_has_excessive_repetition(
            text, min_chars, max_allowed_repeats
        )
        is expected
    )


class ReconnectStubTranscriber:
    async def transcribe(self, _samples, _sample_rate, language):
        return SimpleNamespace(text="", segments=[], language=language)


class ReconnectStubDatabase:
    async def append_transcription(self, _transcription):
        return None


class ReconnectStubAlertEvaluator:
    def evaluate(self, _text):
        return []


async def async_noop(*_args, **_kwargs):
    return None


def make_reconnect_worker(
    *,
    on_transcription=async_noop,
    on_status_change=async_noop,
    on_disconnect=async_noop,
    on_reconnect=async_noop,
) -> StreamWorker:
    stream = Stream(
        id="stream-1",
        name="Test Stream",
        url="https://example.com/stream.mp3",
        status=StreamStatus.STOPPED,
        createdAt=datetime.utcnow(),
        source=StreamSource.AUDIO,
    )
    return StreamWorker(
        stream=stream,
        transcriber=ReconnectStubTranscriber(),
        database=ReconnectStubDatabase(),
        alert_evaluator=ReconnectStubAlertEvaluator(),
        on_transcription=on_transcription,
        on_status_change=on_status_change,
        on_upstream_disconnect=on_disconnect,
        on_upstream_reconnect=on_reconnect,
        config=WhisperConfig(),
    )


class FakeStdout:
    def __init__(self, process: "FakeProcess", chunks):
        self._process = process
        self._chunks = deque(chunks)

    async def read(self, _size: int) -> bytes:
        if self._chunks:
            return self._chunks.popleft()
        if self._process.returncode is None:
            self._process.returncode = 0
        return b""


class FakeProcess:
    def __init__(self, chunks):
        self.stdout = FakeStdout(self, chunks)
        self.stderr = None
        self.returncode = None

    def terminate(self):
        if self.returncode is None:
            self.returncode = 0

    def kill(self):
        self.returncode = -9

    async def wait(self):
        if self.returncode is None:
            self.returncode = 0
        return self.returncode


@pytest.mark.asyncio
async def test_reconnect_backoff_increases_after_repeated_failures(monkeypatch):
    worker = make_reconnect_worker()

    processes = [FakeProcess([]), FakeProcess([])]

    async def fake_create_subprocess_exec(*_args, **_kwargs):
        if not processes:
            pytest.fail("Unexpected extra connection attempt")
        return processes.pop(0)

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_create_subprocess_exec)

    attempts = []

    async def fake_wait_before_reconnect(self, attempt: int) -> bool:
        attempts.append(attempt)
        return attempt < 2

    monkeypatch.setattr(StreamWorker, "_wait_before_reconnect", fake_wait_before_reconnect)

    def fake_start_workers(self):
        self._chunk_queue = None

    async def fake_shutdown_workers(self, *, flush: bool):
        return None

    async def fake_flush_pending_chunks(self):
        return None

    async def fake_ingest_pcm_bytes(self, _pcm: bytes):
        return None

    monkeypatch.setattr(StreamWorker, "_start_transcription_workers", fake_start_workers)
    monkeypatch.setattr(StreamWorker, "_shutdown_transcription_workers", fake_shutdown_workers)
    monkeypatch.setattr(StreamWorker, "_flush_pending_chunks", fake_flush_pending_chunks)
    monkeypatch.setattr(StreamWorker, "_ingest_pcm_bytes", fake_ingest_pcm_bytes)

    await worker._run_pipeline()

    assert attempts == [1, 2]


@pytest.mark.asyncio
async def test_reconnect_backoff_resets_after_receiving_audio(monkeypatch):
    worker = make_reconnect_worker()

    processes = [
        FakeProcess([]),
        FakeProcess([b"\x00\x00\x01\x00", b""]),
        FakeProcess([]),
    ]

    async def fake_create_subprocess_exec(*_args, **_kwargs):
        if not processes:
            pytest.fail("Unexpected extra connection attempt")
        return processes.pop(0)

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_create_subprocess_exec)

    attempts = []

    async def fake_wait_before_reconnect(self, attempt: int) -> bool:
        attempts.append(attempt)
        return attempt < 2

    monkeypatch.setattr(StreamWorker, "_wait_before_reconnect", fake_wait_before_reconnect)

    def fake_start_workers(self):
        self._chunk_queue = None

    async def fake_shutdown_workers(self, *, flush: bool):
        return None

    async def fake_flush_pending_chunks(self):
        return None

    async def fake_ingest_pcm_bytes(self, _pcm: bytes):
        return None

    monkeypatch.setattr(StreamWorker, "_start_transcription_workers", fake_start_workers)
    monkeypatch.setattr(StreamWorker, "_shutdown_transcription_workers", fake_shutdown_workers)
    monkeypatch.setattr(StreamWorker, "_flush_pending_chunks", fake_flush_pending_chunks)
    monkeypatch.setattr(StreamWorker, "_ingest_pcm_bytes", fake_ingest_pcm_bytes)

    await worker._run_pipeline()

    assert attempts == [1, 1, 2]


@pytest.mark.asyncio
async def test_connectivity_events_emitted_for_reconnect(monkeypatch):
    disconnect_events = []
    reconnect_events = []

    async def record_disconnect(_stream, attempt: int, delay: float) -> None:
        disconnect_events.append((attempt, delay))

    async def record_reconnect(_stream, attempt: int) -> None:
        reconnect_events.append(attempt)

    worker = make_reconnect_worker(
        on_disconnect=record_disconnect, on_reconnect=record_reconnect
    )

    processes = [FakeProcess([]), FakeProcess([b"\x00\x00\x01\x00"])]

    async def fake_create_subprocess_exec(*_args, **_kwargs):
        if not processes:
            pytest.fail("Unexpected extra connection attempt")
        return processes.pop(0)

    monkeypatch.setattr(asyncio, "create_subprocess_exec", fake_create_subprocess_exec)

    attempts = []

    async def fake_wait_before_reconnect(self, attempt: int) -> bool:
        attempts.append(attempt)
        return True

    monkeypatch.setattr(StreamWorker, "_wait_before_reconnect", fake_wait_before_reconnect)

    def fake_start_workers(self):
        self._chunk_queue = None

    async def fake_shutdown_workers(self, *, flush: bool):
        return None

    async def fake_flush_pending_chunks(self):
        return None

    chunks_processed = 0

    async def fake_ingest_pcm_bytes(self, _pcm: bytes):
        nonlocal chunks_processed
        chunks_processed += 1
        self._stop_event.set()

    monkeypatch.setattr(StreamWorker, "_start_transcription_workers", fake_start_workers)
    monkeypatch.setattr(StreamWorker, "_shutdown_transcription_workers", fake_shutdown_workers)
    monkeypatch.setattr(StreamWorker, "_flush_pending_chunks", fake_flush_pending_chunks)
    monkeypatch.setattr(StreamWorker, "_ingest_pcm_bytes", fake_ingest_pcm_bytes)

    await worker._run_pipeline()

    assert attempts == [1]
    assert len(disconnect_events) == 1
    assert disconnect_events[0][0] == 1
    assert disconnect_events[0][1] == pytest.approx(0.0)
    assert reconnect_events == [1]
    assert chunks_processed == 1


def test_reconnect_delay_seconds():
    worker = make_reconnect_worker()

    assert worker._reconnect_delay_seconds(1) == 0.0
    assert worker._reconnect_delay_seconds(2) == RECONNECT_BACKOFF_SECONDS
    assert worker._reconnect_delay_seconds(5) == RECONNECT_BACKOFF_SECONDS
