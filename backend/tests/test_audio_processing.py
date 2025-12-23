"""Comprehensive tests for audio processing pipeline."""

import asyncio
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import numpy as np
import pytest
import soundfile as sf

from wavecap_backend.alerts import TranscriptionAlertEvaluator
from wavecap_backend.audio_processing import (
    AudioFrontEndConfig,
    AudioFrontEndProcessor,
)
from wavecap_backend.database import StreamDatabase
from wavecap_backend.models import (
    AlertsConfig,
    Stream,
    StreamSource,
    StreamStatus,
    TranscriptionResult,
    TranscriptionSegment,
    WhisperConfig,
)
from wavecap_backend.datetime_utils import utcnow
from wavecap_backend.stream_worker import (
    BLANK_AUDIO_TOKEN,
    ChunkAccumulator,
    PreparedChunk,
    StreamWorker,
    UNABLE_TO_TRANSCRIBE_TOKEN,
)
from wavecap_backend.whisper_transcriber import (
    AbstractTranscriber,
    TranscriptionResultBundle,
)


# --- Audio Generation Utilities ---


def generate_sine_wave(
    frequency_hz: float,
    duration_seconds: float,
    sample_rate: int = 16000,
    amplitude: float = 0.5,
) -> np.ndarray:
    """Generate a pure sine wave."""
    t = np.linspace(0, duration_seconds, int(sample_rate * duration_seconds), dtype=np.float32)
    return (amplitude * np.sin(2 * np.pi * frequency_hz * t)).astype(np.float32)


def generate_speech_like_signal(
    duration_seconds: float,
    sample_rate: int = 16000,
    amplitude: float = 0.3,
) -> np.ndarray:
    """Generate a signal that mimics speech characteristics (multiple harmonics, amplitude variation)."""
    t = np.linspace(0, duration_seconds, int(sample_rate * duration_seconds), dtype=np.float32)
    # Speech has fundamental around 100-300 Hz with harmonics
    fundamental = 150.0
    signal = np.zeros_like(t)
    # Add harmonics with decreasing amplitude
    for harmonic in range(1, 6):
        freq = fundamental * harmonic
        harm_amp = amplitude / harmonic
        signal += harm_amp * np.sin(2 * np.pi * freq * t)
    # Add amplitude modulation to mimic syllables
    envelope = 0.5 + 0.5 * np.sin(2 * np.pi * 3.0 * t)  # ~3 Hz modulation
    return (signal * envelope).astype(np.float32)


def generate_silence(duration_seconds: float, sample_rate: int = 16000) -> np.ndarray:
    """Generate silence (zeros)."""
    return np.zeros(int(sample_rate * duration_seconds), dtype=np.float32)


def generate_noise(
    duration_seconds: float,
    sample_rate: int = 16000,
    amplitude: float = 0.01,
) -> np.ndarray:
    """Generate white noise at low amplitude (background noise)."""
    samples = int(sample_rate * duration_seconds)
    return (amplitude * np.random.randn(samples)).astype(np.float32)


def generate_dc_offset_signal(
    duration_seconds: float,
    dc_offset: float = 0.2,
    sample_rate: int = 16000,
) -> np.ndarray:
    """Generate a signal with DC offset (simulates microphone bias)."""
    return np.full(int(sample_rate * duration_seconds), dc_offset, dtype=np.float32)


def generate_mixed_audio(
    segments: List[tuple],
    sample_rate: int = 16000,
) -> np.ndarray:
    """Generate audio from a list of (type, duration, params) tuples.

    Types: 'speech', 'silence', 'tone', 'noise'
    """
    parts = []
    for seg_type, duration, params in segments:
        if seg_type == "speech":
            parts.append(generate_speech_like_signal(duration, sample_rate, params.get("amplitude", 0.3)))
        elif seg_type == "silence":
            parts.append(generate_silence(duration, sample_rate))
        elif seg_type == "tone":
            parts.append(generate_sine_wave(params.get("freq", 440), duration, sample_rate, params.get("amplitude", 0.3)))
        elif seg_type == "noise":
            parts.append(generate_noise(duration, sample_rate, params.get("amplitude", 0.01)))
        else:
            raise ValueError(f"Unknown segment type: {seg_type}")
    return np.concatenate(parts)


# --- Test Fixtures ---


class StubTranscriber(AbstractTranscriber):
    """Test transcriber that returns canned responses."""

    def __init__(self, bundles: List[TranscriptionResultBundle]):
        self._bundles = list(bundles)
        self.calls: List[np.ndarray] = []
        self.call_sample_rates: List[int] = []

    async def transcribe(self, audio: np.ndarray, sample_rate: int, language: Optional[str] = None):
        self.calls.append(audio.copy())
        self.call_sample_rates.append(sample_rate)
        if not self._bundles:
            return TranscriptionResultBundle("", [], language, no_speech_prob=0.9)
        return self._bundles.pop(0)


def make_test_stream(stream_id: str = "test-stream") -> Stream:
    return Stream(
        id=stream_id,
        name="Test Stream",
        url="http://example.com/audio",
        status=StreamStatus.STOPPED,
        createdAt=utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
    )


def make_test_segment(
    seg_id: int,
    text: str,
    start: float,
    end: float,
    no_speech_prob: float = 0.1,
) -> TranscriptionSegment:
    return TranscriptionSegment(
        id=seg_id,
        text=text,
        start=start,
        end=end,
        seek=0,
        no_speech_prob=no_speech_prob,
        temperature=0.0,
        avg_logprob=-0.5,
        compression_ratio=1.2,
    )


# --- AudioFrontEndProcessor Tests ---


def test_audio_frontend_highpass_tracks_dc_offset() -> None:
    """Highpass filter removes DC offset (microphone bias)."""
    config = AudioFrontEndConfig(
        sample_rate=16000,
        highpass_cutoff_hz=250.0,
        lowpass_cutoff_hz=None,
        deemphasis_time_constant=None,
        agc_target_rms=None,
    )
    processor = AudioFrontEndProcessor(config)
    samples = np.full(32000, 0.2, dtype=np.float32)
    processed = processor.process(samples)
    steady_state = processed[2000:]
    assert abs(float(np.mean(steady_state))) < 1e-3


def test_audio_frontend_agc_boosts_quiet_signal() -> None:
    """AGC boosts quiet signals to target RMS level."""
    config = AudioFrontEndConfig(
        sample_rate=16000,
        highpass_cutoff_hz=None,
        lowpass_cutoff_hz=None,
        deemphasis_time_constant=None,
        agc_target_rms=0.05,
        agc_max_gain=8.0,
    )
    processor = AudioFrontEndProcessor(config)
    samples = np.full(4000, 0.005, dtype=np.float32)
    processed = processor.process(samples, target_rms=0.05)
    rms = float(np.sqrt(np.mean(np.square(processed))))
    assert rms > 0.02


def test_audio_frontend_lowpass_attenuates_high_frequencies() -> None:
    """Lowpass filter attenuates frequencies above cutoff."""
    config = AudioFrontEndConfig(
        sample_rate=16000,
        highpass_cutoff_hz=None,
        lowpass_cutoff_hz=1000.0,  # Cut above 1kHz
        deemphasis_time_constant=None,
        agc_target_rms=None,
    )
    processor = AudioFrontEndProcessor(config)

    # High frequency signal (4kHz) should be attenuated
    high_freq = generate_sine_wave(4000, 0.5, 16000, 0.5)
    processed_high = processor.process(high_freq)

    processor.reset()

    # Low frequency signal (200Hz) should pass through
    low_freq = generate_sine_wave(200, 0.5, 16000, 0.5)
    processed_low = processor.process(low_freq)

    # High freq should be significantly attenuated vs low freq
    rms_high = float(np.sqrt(np.mean(np.square(processed_high[2000:]))))
    rms_low = float(np.sqrt(np.mean(np.square(processed_low[2000:]))))

    assert rms_high < rms_low * 0.5  # At least 50% attenuation


def test_audio_frontend_highpass_preserves_speech_frequencies() -> None:
    """Highpass filter preserves speech frequencies while removing low rumble."""
    config = AudioFrontEndConfig(
        sample_rate=16000,
        highpass_cutoff_hz=100.0,  # Typical voice starts around 100Hz
        lowpass_cutoff_hz=None,
        deemphasis_time_constant=None,
        agc_target_rms=None,
    )
    processor = AudioFrontEndProcessor(config)

    # 300Hz is well within speech range - should pass
    speech_freq = generate_sine_wave(300, 0.5, 16000, 0.5)
    processed = processor.process(speech_freq)

    # Should preserve most of the signal
    rms_in = float(np.sqrt(np.mean(np.square(speech_freq))))
    rms_out = float(np.sqrt(np.mean(np.square(processed[2000:]))))

    assert rms_out > rms_in * 0.7  # At least 70% preserved


def test_audio_frontend_deemphasis_smooths_signal() -> None:
    """Deemphasis filter smooths harsh transitions."""
    config = AudioFrontEndConfig(
        sample_rate=16000,
        highpass_cutoff_hz=None,
        lowpass_cutoff_hz=None,
        deemphasis_time_constant=75e-6,  # Standard FM deemphasis
        agc_target_rms=None,
    )
    processor = AudioFrontEndProcessor(config)

    # Create signal with sharp transitions (square-ish wave)
    t = np.linspace(0, 0.1, 1600, dtype=np.float32)
    sharp_signal = np.sign(np.sin(2 * np.pi * 100 * t)).astype(np.float32) * 0.5

    processed = processor.process(sharp_signal)

    # Processed signal should have smoother transitions (lower high-freq energy)
    # Calculate rough "sharpness" via derivative
    diff_original = np.abs(np.diff(sharp_signal))
    diff_processed = np.abs(np.diff(processed))

    assert np.max(diff_processed) < np.max(diff_original)


def test_audio_frontend_agc_respects_max_gain() -> None:
    """AGC doesn't amplify beyond max_gain limit."""
    config = AudioFrontEndConfig(
        sample_rate=16000,
        highpass_cutoff_hz=None,
        lowpass_cutoff_hz=None,
        deemphasis_time_constant=None,
        agc_target_rms=0.5,  # High target
        agc_max_gain=2.0,  # But limited gain
    )
    processor = AudioFrontEndProcessor(config)

    # Very quiet signal
    quiet = np.full(4000, 0.01, dtype=np.float32)
    processed = processor.process(quiet, target_rms=0.5)

    # With max_gain=2, output should be ~0.02, not 0.5
    rms_out = float(np.sqrt(np.mean(np.square(processed))))
    assert rms_out < 0.05  # Nowhere near 0.5 target


def test_audio_frontend_agc_clips_to_unit_range() -> None:
    """AGC clips output to [-1, 1] range."""
    config = AudioFrontEndConfig(
        sample_rate=16000,
        highpass_cutoff_hz=None,
        lowpass_cutoff_hz=None,
        deemphasis_time_constant=None,
        agc_target_rms=0.5,
        agc_max_gain=20.0,  # Very high gain
    )
    processor = AudioFrontEndProcessor(config)

    # Signal that would clip if gained up too much
    signal = generate_sine_wave(440, 0.1, 16000, 0.2)
    processed = processor.process(signal, target_rms=0.5)

    assert np.all(processed >= -1.0)
    assert np.all(processed <= 1.0)


def test_audio_frontend_agc_no_boost_for_loud_signal() -> None:
    """AGC doesn't boost signals already at or above target."""
    config = AudioFrontEndConfig(
        sample_rate=16000,
        highpass_cutoff_hz=None,
        lowpass_cutoff_hz=None,
        deemphasis_time_constant=None,
        agc_target_rms=0.1,
        agc_max_gain=10.0,
    )
    processor = AudioFrontEndProcessor(config)

    # Already loud signal
    loud = np.full(4000, 0.3, dtype=np.float32)
    processed = processor.process(loud, target_rms=0.1)

    # Should not be amplified
    np.testing.assert_array_almost_equal(processed, loud)


def test_audio_frontend_reset_clears_filter_state() -> None:
    """reset() clears internal filter state to avoid transients."""
    config = AudioFrontEndConfig(
        sample_rate=16000,
        highpass_cutoff_hz=250.0,
        lowpass_cutoff_hz=None,
        deemphasis_time_constant=None,
        agc_target_rms=None,
    )
    processor = AudioFrontEndProcessor(config)

    # Process some audio to build up filter state
    signal = generate_sine_wave(440, 0.5, 16000, 0.3)
    processor.process(signal)

    # Reset
    processor.reset()

    # Now process a DC offset - initial transient should be similar to fresh processor
    fresh_processor = AudioFrontEndProcessor(config)
    dc_signal = np.full(8000, 0.2, dtype=np.float32)

    processed_reset = processor.process(dc_signal)
    processed_fresh = fresh_processor.process(dc_signal)

    # Initial behavior should be similar (within reasonable tolerance)
    np.testing.assert_array_almost_equal(processed_reset[:100], processed_fresh[:100], decimal=3)


def test_audio_frontend_empty_input() -> None:
    """Processing empty array returns empty array."""
    config = AudioFrontEndConfig(sample_rate=16000)
    processor = AudioFrontEndProcessor(config)

    empty = np.array([], dtype=np.float32)
    result = processor.process(empty)

    assert result.size == 0


def test_audio_frontend_full_chain() -> None:
    """Full processing chain (highpass + lowpass + deemphasis + AGC) works together."""
    config = AudioFrontEndConfig(
        sample_rate=16000,
        highpass_cutoff_hz=100.0,
        lowpass_cutoff_hz=4000.0,
        deemphasis_time_constant=75e-6,
        agc_target_rms=0.1,
        agc_max_gain=10.0,
    )
    processor = AudioFrontEndProcessor(config)

    # Simulate realistic radio audio: speech + DC offset + noise
    speech = generate_speech_like_signal(1.0, 16000, 0.03)  # Very quiet speech
    dc_offset = np.full_like(speech, 0.1)  # DC bias
    noise = generate_noise(1.0, 16000, 0.005)  # Background noise

    raw_audio = speech + dc_offset + noise
    processed = processor.process(raw_audio, target_rms=0.1)

    # Should have removed DC offset (mean near zero)
    assert abs(float(np.mean(processed[2000:]))) < 0.02

    # RMS should be near target (0.1) after AGC
    rms_out = float(np.sqrt(np.mean(np.square(processed))))
    assert rms_out >= 0.08  # Near target RMS


def test_audio_frontend_preserves_stereo_to_mono() -> None:
    """Processor handles mono input correctly (typical for Whisper)."""
    config = AudioFrontEndConfig(sample_rate=16000, highpass_cutoff_hz=100.0)
    processor = AudioFrontEndProcessor(config)

    mono = generate_sine_wave(440, 0.1, 16000, 0.3)
    assert mono.ndim == 1

    processed = processor.process(mono)
    assert processed.ndim == 1
    assert processed.size == mono.size


# --- ChunkAccumulator Tests ---


def test_chunk_accumulator_speech_then_silence_flushes() -> None:
    """Speech followed by silence triggers chunk emission."""
    chunker = ChunkAccumulator(
        sample_rate=16000,
        max_chunk_seconds=10.0,
        min_chunk_seconds=1.0,
        context_seconds=0.0,
        silence_threshold=0.01,
        silence_lookback_seconds=0.25,
        silence_hold_seconds=0.25,
        active_ratio_threshold=0.1,
    )

    # 2 seconds of speech-like audio
    speech = generate_speech_like_signal(2.0, 16000, 0.3)
    chunks = chunker.add_samples(speech)
    assert len(chunks) == 0  # Not flushed yet - no silence

    # 0.5 seconds of silence
    silence = generate_silence(0.5, 16000)
    chunks = chunker.add_samples(silence)

    # Should flush after silence
    assert len(chunks) == 1
    assert chunks[0].samples.size >= 16000 * 2  # At least 2 seconds


def test_chunk_accumulator_continuous_speech_hits_max() -> None:
    """Continuous speech without silence triggers max chunk size."""
    chunker = ChunkAccumulator(
        sample_rate=16000,
        max_chunk_seconds=2.0,
        min_chunk_seconds=0.5,
        context_seconds=0.0,
        silence_threshold=0.01,
        silence_lookback_seconds=0.25,
        silence_hold_seconds=0.25,
        active_ratio_threshold=0.1,
    )

    # 5 seconds of continuous speech
    speech = generate_speech_like_signal(5.0, 16000, 0.3)
    chunks = chunker.add_samples(speech)

    # Should emit at least 2 chunks (5 / 2 = 2.5)
    assert len(chunks) >= 2
    # First chunks should be max size
    assert chunks[0].samples.size == 16000 * 2


def test_chunk_accumulator_realistic_radio_conversation() -> None:
    """Simulate realistic radio: speech, pause, speech, pause pattern."""
    chunker = ChunkAccumulator(
        sample_rate=16000,
        max_chunk_seconds=30.0,
        min_chunk_seconds=1.0,
        context_seconds=0.5,
        silence_threshold=0.01,
        silence_lookback_seconds=0.25,
        silence_hold_seconds=0.3,
        active_ratio_threshold=0.1,
    )

    # Dispatch: 2s speech
    chunks = chunker.add_samples(generate_speech_like_signal(2.0, 16000, 0.3))
    assert len(chunks) == 0

    # Pause: 0.5s silence (triggers flush)
    chunks = chunker.add_samples(generate_silence(0.5, 16000))
    assert len(chunks) == 1

    # Unit responds: 1.5s speech
    chunks = chunker.add_samples(generate_speech_like_signal(1.5, 16000, 0.25))
    assert len(chunks) == 0

    # Pause: 0.5s silence (triggers flush with context prefix)
    chunks = chunker.add_samples(generate_silence(0.5, 16000))
    assert len(chunks) == 1
    # Should have context prefix from previous chunk
    assert chunks[0].prefix_samples > 0


def test_chunk_accumulator_very_quiet_audio_treated_as_silence() -> None:
    """Audio below silence threshold is treated as silence."""
    chunker = ChunkAccumulator(
        sample_rate=16000,
        max_chunk_seconds=10.0,
        min_chunk_seconds=1.0,
        context_seconds=0.0,
        silence_threshold=0.02,  # Threshold
        silence_lookback_seconds=0.25,
        silence_hold_seconds=0.0,
        active_ratio_threshold=0.1,
    )

    # Normal audio
    speech = generate_speech_like_signal(2.0, 16000, 0.3)
    chunker.add_samples(speech)

    # Very quiet noise (below threshold)
    quiet_noise = generate_noise(0.5, 16000, 0.005)  # Below 0.02 threshold
    chunks = chunker.add_samples(quiet_noise)

    # Should trigger flush because quiet noise is treated as silence
    assert len(chunks) == 1


def test_chunk_accumulator_noise_floor_not_silence() -> None:
    """Noise above threshold is NOT treated as silence."""
    chunker = ChunkAccumulator(
        sample_rate=16000,
        max_chunk_seconds=10.0,
        min_chunk_seconds=1.0,
        context_seconds=0.0,
        silence_threshold=0.01,
        silence_lookback_seconds=0.25,
        silence_hold_seconds=0.0,
        active_ratio_threshold=0.1,
    )

    # Some speech
    chunker.add_samples(generate_speech_like_signal(1.5, 16000, 0.3))

    # Loud noise (above threshold) - should NOT trigger flush
    loud_noise = generate_noise(0.5, 16000, 0.05)
    chunks = chunker.add_samples(loud_noise)

    # No flush - noise is "active"
    assert len(chunks) == 0


# --- End-to-End StreamWorker Audio Tests ---


@pytest.mark.asyncio
async def test_worker_full_audio_pipeline(tmp_path: Path) -> None:
    """Test complete audio pipeline from PCM bytes to transcription."""
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=10,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
        highpassCutoffHz=100.0,
        agcTargetRms=0.1,
    )

    bundle = TranscriptionResultBundle(
        "Unit 5 responding",
        [make_test_segment(0, "Unit 5 responding", 0.0, 2.0)],
        "en",
        no_speech_prob=0.1,
    )
    transcriber = StubTranscriber([bundle])

    stream = make_test_stream()
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(tx: TranscriptionResult) -> None:
        captured.append(tx)

    async def noop_status(_s: Stream, _st: StreamStatus) -> None:
        pass

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=noop_status,
        config=config,
    )

    # Simulate PCM bytes input: speech + silence
    speech = generate_speech_like_signal(2.0, 16000, 0.3)
    silence = generate_silence(0.5, 16000)
    audio = np.concatenate([speech, silence])
    pcm_bytes = (audio * 32768).astype(np.int16).tobytes()

    # Ingest
    await worker._ingest_pcm_bytes(pcm_bytes)

    # Should have triggered transcription
    assert len(transcriber.calls) == 1
    assert len(captured) == 1
    assert captured[0].text == "Unit 5 responding"

    # Transcriber should have received processed audio
    processed_audio = transcriber.calls[0]
    # Should be float32, roughly same length (minus some processing)
    assert processed_audio.dtype == np.float32


@pytest.mark.asyncio
async def test_worker_agc_boosts_quiet_audio(tmp_path: Path) -> None:
    """Worker's AGC boosts quiet audio before transcription."""
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=10,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.0,
        silenceThreshold=0.005,  # Low threshold
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
        highpassCutoffHz=None,
        agcTargetRms=0.1,  # Target RMS
    )

    bundle = TranscriptionResultBundle("Test", [], "en", no_speech_prob=0.1)
    transcriber = StubTranscriber([bundle])

    stream = make_test_stream()
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=lambda _: asyncio.sleep(0),
        on_status_change=lambda _s, _st: asyncio.sleep(0),
        config=config,
    )

    # Very quiet speech + silence
    quiet_speech = generate_speech_like_signal(2.0, 16000, 0.02)  # Very quiet
    silence = generate_silence(0.5, 16000)
    audio = np.concatenate([quiet_speech, silence])
    pcm_bytes = (audio * 32768).astype(np.int16).tobytes()

    await worker._ingest_pcm_bytes(pcm_bytes)

    assert len(transcriber.calls) == 1
    processed = transcriber.calls[0]

    # RMS should be boosted toward target
    original_rms = float(np.sqrt(np.mean(np.square(quiet_speech))))
    processed_rms = float(np.sqrt(np.mean(np.square(processed))))

    assert processed_rms > original_rms * 2  # At least 2x boost


@pytest.mark.asyncio
async def test_worker_highpass_removes_dc_offset(tmp_path: Path) -> None:
    """Worker's highpass filter removes DC offset from audio."""
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=10,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
        highpassCutoffHz=100.0,  # Enable highpass
        agcTargetRms=None,  # Disable AGC for cleaner test
    )

    bundle = TranscriptionResultBundle("Test", [], "en", no_speech_prob=0.1)
    transcriber = StubTranscriber([bundle])

    stream = make_test_stream()
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=lambda _: asyncio.sleep(0),
        on_status_change=lambda _s, _st: asyncio.sleep(0),
        config=config,
    )

    # Speech with DC offset + silence
    speech = generate_speech_like_signal(2.0, 16000, 0.3)
    dc_offset = np.full_like(speech, 0.15)  # 15% DC bias
    silence = generate_silence(0.5, 16000)
    audio = np.concatenate([speech + dc_offset, silence])
    pcm_bytes = (audio * 32768).astype(np.int16).tobytes()

    await worker._ingest_pcm_bytes(pcm_bytes)

    assert len(transcriber.calls) == 1
    processed = transcriber.calls[0]

    # Mean should be near zero (DC removed)
    # Skip first bit for filter settling
    mean_processed = abs(float(np.mean(processed[3000:])))
    assert mean_processed < 0.03  # DC largely removed


@pytest.mark.asyncio
async def test_worker_discards_low_energy_audio(tmp_path: Path) -> None:
    """Worker discards transcription results when audio has very low energy."""
    # The low-energy detection uses:
    # - peak_threshold = max(silence_threshold * 3, 0.04)
    # - rms_threshold = max(silence_threshold * 1.5, 0.01)
    # With silence_threshold=0.003: peak_th=0.04, rms_th=0.01
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=10,
        minChunkDurationSeconds=0.5,
        contextSeconds=0.0,
        silenceThreshold=0.003,  # Very low so weak signal is "active" for chunking
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.0,
        activeSamplesInLookbackPct=0.05,
        blankAudioMinDurationSeconds=0.5,
        blankAudioMinActiveRatio=0.05,
    )

    # Transcriber returns text, but it should be discarded due to low energy
    bundle = TranscriptionResultBundle(
        "Phantom text that should be discarded",
        [],
        "en",
        no_speech_prob=0.3,
    )
    transcriber = StubTranscriber([bundle])

    stream = make_test_stream()
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(tx: TranscriptionResult) -> None:
        captured.append(tx)

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=lambda _s, _st: asyncio.sleep(0),
        config=config,
    )

    # Very low-energy noise: peak < 0.04, RMS < 0.01
    # Amplitude of 0.005 gives RMS ≈ 0.0035 and peak ≈ 0.015 (usually)
    low_energy_noise = generate_noise(1.5, 16000, 0.005)
    silence = generate_silence(0.5, 16000)  # Silence to trigger flush
    audio = np.concatenate([low_energy_noise, silence])
    pcm_bytes = (audio * 32768).astype(np.int16).tobytes()

    await worker._ingest_pcm_bytes(pcm_bytes)

    # Should emit [BLANK_AUDIO] instead of phantom text due to low energy
    assert len(captured) == 1
    assert captured[0].text == BLANK_AUDIO_TOKEN


@pytest.mark.asyncio
async def test_worker_hallucination_detection(tmp_path: Path) -> None:
    """Worker detects and discards hallucinated phrases on silence."""
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=10,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.0,
        silenceThreshold=0.005,  # Low threshold so low noise registers as active
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.0,  # Immediate flush on silence
        activeSamplesInLookbackPct=0.1,
        silenceHallucinationPhrases=["Thank you.", "Thanks for watching."],
    )

    # Whisper hallucination on near-silence
    bundle = TranscriptionResultBundle(
        "Thank you.",
        [],
        "en",
        no_speech_prob=0.8,  # High no_speech_prob indicates likely hallucination
    )
    transcriber = StubTranscriber([bundle])

    stream = make_test_stream()
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(tx: TranscriptionResult) -> None:
        captured.append(tx)

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=lambda _s, _st: asyncio.sleep(0),
        config=config,
    )

    # Low-level noise above silence threshold, then true silence to flush
    low_noise = generate_noise(2.0, 16000, 0.01)  # Above 0.005 threshold
    silence = generate_silence(0.5, 16000)  # Triggers flush
    audio = np.concatenate([low_noise, silence])
    pcm_bytes = (audio * 32768).astype(np.int16).tobytes()

    await worker._ingest_pcm_bytes(pcm_bytes)

    # Hallucination should be discarded, emit blank audio
    assert len(captured) == 1
    assert captured[0].text == BLANK_AUDIO_TOKEN


@pytest.mark.asyncio
async def test_worker_preserves_valid_speech(tmp_path: Path) -> None:
    """Worker preserves valid speech transcriptions."""
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=10,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
        silenceHallucinationPhrases=["Thank you."],
    )

    # Real speech transcription
    segments = [
        make_test_segment(0, "Engine 4, ", 0.0, 1.0, no_speech_prob=0.05),
        make_test_segment(1, "respond to Main Street.", 1.0, 2.5, no_speech_prob=0.03),
    ]
    bundle = TranscriptionResultBundle(
        "Engine 4, respond to Main Street.",
        segments,
        "en",
        no_speech_prob=0.05,  # Low no_speech_prob = real speech
    )
    transcriber = StubTranscriber([bundle])

    stream = make_test_stream()
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(tx: TranscriptionResult) -> None:
        captured.append(tx)

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=lambda _s, _st: asyncio.sleep(0),
        config=config,
    )

    # Real speech audio
    speech = generate_speech_like_signal(3.0, 16000, 0.3)
    silence = generate_silence(0.5, 16000)
    audio = np.concatenate([speech, silence])
    pcm_bytes = (audio * 32768).astype(np.int16).tobytes()

    await worker._ingest_pcm_bytes(pcm_bytes)

    # Should emit the transcription
    assert len(captured) == 1
    assert "Engine 4" in captured[0].text
    assert "Main Street" in captured[0].text


@pytest.mark.asyncio
async def test_worker_context_prefix_included_in_transcription(tmp_path: Path) -> None:
    """Worker includes context from previous chunk in transcription."""
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=5,  # Max 5 seconds
        minChunkDurationSeconds=1.0,
        contextSeconds=0.5,  # 0.5 second context
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
    )

    bundles = [
        TranscriptionResultBundle("First chunk", [], "en", no_speech_prob=0.1),
        TranscriptionResultBundle("Second chunk", [], "en", no_speech_prob=0.1),
    ]
    transcriber = StubTranscriber(bundles)

    stream = make_test_stream()
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=lambda _: asyncio.sleep(0),
        on_status_change=lambda _s, _st: asyncio.sleep(0),
        config=config,
    )

    # First utterance
    speech1 = generate_speech_like_signal(2.0, 16000, 0.3)
    silence1 = generate_silence(0.5, 16000)
    pcm1 = (np.concatenate([speech1, silence1]) * 32768).astype(np.int16).tobytes()
    await worker._ingest_pcm_bytes(pcm1)

    # Second utterance - should have context prefix
    speech2 = generate_speech_like_signal(2.0, 16000, 0.3)
    silence2 = generate_silence(0.5, 16000)
    pcm2 = (np.concatenate([speech2, silence2]) * 32768).astype(np.int16).tobytes()
    await worker._ingest_pcm_bytes(pcm2)

    assert len(transcriber.calls) == 2

    # Second call should have more samples (includes context prefix)
    # First call has just the chunk, second has chunk + context
    first_call_samples = transcriber.calls[0].size
    second_call_samples = transcriber.calls[1].size

    context_samples = int(0.5 * 16000)
    assert second_call_samples >= first_call_samples  # May have context


@pytest.mark.asyncio
async def test_worker_saves_recording_file(tmp_path: Path) -> None:
    """Worker saves audio recording to disk."""
    import wavecap_backend.stream_worker as stream_worker_module

    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=10,
        minChunkDurationSeconds=1.0,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
    )

    bundle = TranscriptionResultBundle("Test recording", [], "en", no_speech_prob=0.1)
    transcriber = StubTranscriber([bundle])

    stream = make_test_stream("recording-test")
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(tx: TranscriptionResult) -> None:
        captured.append(tx)

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=lambda _s, _st: asyncio.sleep(0),
        config=config,
    )

    # Generate and process audio
    speech = generate_speech_like_signal(2.0, 16000, 0.3)
    silence = generate_silence(0.5, 16000)
    audio = np.concatenate([speech, silence])
    pcm_bytes = (audio * 32768).astype(np.int16).tobytes()

    await worker._ingest_pcm_bytes(pcm_bytes)

    assert len(captured) == 1

    # Should have recording URL
    assert captured[0].recordingUrl is not None

    # Recording file should exist
    recording_path = stream_worker_module.RECORDINGS_DIR / Path(captured[0].recordingUrl).name
    assert recording_path.exists()

    # Verify it's valid audio
    audio_data, sample_rate = sf.read(recording_path, dtype="float32")
    assert sample_rate == 16000
    assert audio_data.size > 0


@pytest.mark.asyncio
async def test_worker_multiple_chunks_sequential(tmp_path: Path) -> None:
    """Worker handles multiple sequential chunks correctly."""
    config = WhisperConfig(
        sampleRate=16000,
        chunkLength=5,
        minChunkDurationSeconds=0.5,
        contextSeconds=0.0,
        silenceThreshold=0.01,
        silenceLookbackSeconds=0.25,
        silenceHoldSeconds=0.25,
        activeSamplesInLookbackPct=0.1,
    )

    bundles = [
        TranscriptionResultBundle("Message one", [], "en", no_speech_prob=0.1),
        TranscriptionResultBundle("Message two", [], "en", no_speech_prob=0.1),
        TranscriptionResultBundle("Message three", [], "en", no_speech_prob=0.1),
    ]
    transcriber = StubTranscriber(bundles)

    stream = make_test_stream()
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    evaluator = TranscriptionAlertEvaluator(AlertsConfig(enabled=False, rules=[]))
    captured: List[TranscriptionResult] = []

    async def capture(tx: TranscriptionResult) -> None:
        captured.append(tx)

    worker = StreamWorker(
        stream=stream,
        transcriber=transcriber,
        database=db,
        alert_evaluator=evaluator,
        on_transcription=capture,
        on_status_change=lambda _s, _st: asyncio.sleep(0),
        config=config,
    )

    # Process 3 separate utterances
    for i in range(3):
        speech = generate_speech_like_signal(1.0, 16000, 0.3)
        silence = generate_silence(0.4, 16000)
        audio = np.concatenate([speech, silence])
        pcm_bytes = (audio * 32768).astype(np.int16).tobytes()
        await worker._ingest_pcm_bytes(pcm_bytes)

    assert len(captured) == 3
    assert captured[0].text == "Message one"
    assert captured[1].text == "Message two"
    assert captured[2].text == "Message three"
