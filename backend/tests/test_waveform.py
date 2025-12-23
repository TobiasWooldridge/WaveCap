"""Tests for waveform generation utilities."""

import numpy as np

from wavecap_backend.waveform import (
    BARS_PER_SECOND,
    MAX_BARS,
    MIN_BARS,
    compute_waveform,
    compute_waveform_with_speech_markers,
)


def test_compute_waveform_empty_samples():
    """Empty samples return zeros."""
    samples = np.array([], dtype=np.float32)

    result = compute_waveform(samples, num_bars=20)

    assert len(result) == 20
    assert all(v == 0.0 for v in result)


def test_compute_waveform_returns_correct_num_bars():
    """Output has requested number of bars."""
    samples = np.random.randn(16000).astype(np.float32)

    result = compute_waveform(samples, num_bars=50)

    assert len(result) == 50


def test_compute_waveform_num_bars_from_duration():
    """num_bars is computed from duration when not specified."""
    samples = np.random.randn(16000).astype(np.float32)
    duration = 2.0  # 2 seconds

    result = compute_waveform(samples, duration=duration)

    expected_bars = int(duration * BARS_PER_SECOND)
    assert len(result) == expected_bars


def test_compute_waveform_duration_respects_min_max():
    """Duration-based bars are clamped to MIN_BARS and MAX_BARS."""
    samples = np.random.randn(16000).astype(np.float32)

    # Very short duration
    short_result = compute_waveform(samples, duration=0.1)
    assert len(short_result) == MIN_BARS

    # Very long duration
    long_result = compute_waveform(samples, duration=100.0)
    assert len(long_result) == MAX_BARS


def test_compute_waveform_normalizes_to_unit_range():
    """Output values are normalized between 0.0 and 1.0."""
    # Create samples with varying amplitude
    samples = np.sin(np.linspace(0, 10 * np.pi, 16000)).astype(np.float32)

    result = compute_waveform(samples, num_bars=20, normalize=True)

    assert all(0.0 <= v <= 1.0 for v in result)
    # At least one value should be 1.0 (the maximum)
    assert max(result) == 1.0


def test_compute_waveform_no_normalize():
    """When normalize=False, raw RMS values are returned."""
    amplitude = 0.5
    samples = np.full(16000, amplitude, dtype=np.float32)

    result = compute_waveform(samples, num_bars=20, normalize=False)

    # RMS of constant value is the value itself
    assert all(abs(v - amplitude) < 0.01 for v in result)


def test_compute_waveform_silent_audio():
    """Silent audio produces all zeros."""
    samples = np.zeros(16000, dtype=np.float32)

    result = compute_waveform(samples, num_bars=20)

    assert all(v == 0.0 for v in result)


def test_compute_waveform_values_rounded():
    """Output values are rounded to 3 decimal places."""
    samples = np.random.randn(16000).astype(np.float32)

    result = compute_waveform(samples, num_bars=20)

    for v in result:
        rounded = round(v, 3)
        assert v == rounded


def test_compute_waveform_short_audio_padded():
    """Audio shorter than num_bars is padded."""
    # Only 10 samples, requesting 20 bars
    samples = np.ones(10, dtype=np.float32)

    result = compute_waveform(samples, num_bars=20)

    assert len(result) == 20


def test_compute_waveform_preserves_amplitude_distribution():
    """Loud and quiet sections are distinguishable."""
    # First half loud, second half quiet
    loud = np.full(8000, 1.0, dtype=np.float32)
    quiet = np.full(8000, 0.1, dtype=np.float32)
    samples = np.concatenate([loud, quiet])

    result = compute_waveform(samples, num_bars=20, normalize=True)

    # First half should have higher amplitude than second half
    first_half_avg = sum(result[:10]) / 10
    second_half_avg = sum(result[10:]) / 10
    assert first_half_avg > second_half_avg


def test_compute_waveform_with_speech_markers_basic():
    """compute_waveform_with_speech_markers returns waveform and markers."""
    sample_rate = 16000
    duration = 2.0
    samples = np.random.randn(int(sample_rate * duration)).astype(np.float32)

    result = compute_waveform_with_speech_markers(
        samples,
        sample_rate,
        speech_start=0.5,
        speech_end=1.5,
    )

    assert "waveform" in result
    assert len(result["waveform"]) > 0
    assert "speechStartBar" in result
    assert "speechEndBar" in result


def test_compute_waveform_with_speech_markers_bar_positions():
    """Speech marker bars are computed from offset positions."""
    sample_rate = 16000
    duration = 4.0
    samples = np.random.randn(int(sample_rate * duration)).astype(np.float32)

    result = compute_waveform_with_speech_markers(
        samples,
        sample_rate,
        speech_start=1.0,  # 25% into the audio
        speech_end=3.0,    # 75% into the audio
    )

    num_bars = len(result["waveform"])
    expected_start_bar = int((1.0 / duration) * num_bars)
    expected_end_bar = min(int((3.0 / duration) * num_bars), num_bars - 1)

    assert result["speechStartBar"] == expected_start_bar
    assert result["speechEndBar"] == expected_end_bar


def test_compute_waveform_with_speech_markers_no_markers():
    """Speech markers are omitted when not provided."""
    sample_rate = 16000
    samples = np.random.randn(16000).astype(np.float32)

    result = compute_waveform_with_speech_markers(samples, sample_rate)

    assert "waveform" in result
    assert "speechStartBar" not in result
    assert "speechEndBar" not in result


def test_compute_waveform_with_speech_markers_custom_num_bars():
    """num_bars parameter is respected."""
    sample_rate = 16000
    samples = np.random.randn(16000).astype(np.float32)

    result = compute_waveform_with_speech_markers(
        samples,
        sample_rate,
        num_bars=100,
    )

    assert len(result["waveform"]) == 100


def test_compute_waveform_with_speech_markers_zero_duration():
    """Zero-duration audio handles markers gracefully."""
    sample_rate = 16000
    samples = np.array([], dtype=np.float32)

    result = compute_waveform_with_speech_markers(
        samples,
        sample_rate,
        speech_start=0.0,
        speech_end=0.0,
    )

    assert "waveform" in result
    # Markers should not be present when duration is 0
    assert "speechStartBar" not in result
    assert "speechEndBar" not in result
