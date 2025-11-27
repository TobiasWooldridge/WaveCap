"""Waveform generation utilities for audio visualization."""

from __future__ import annotations

import logging
from typing import List, Optional

import numpy as np

LOGGER = logging.getLogger(__name__)

# Number of waveform bars per second of audio
BARS_PER_SECOND = 20

# Minimum and maximum bars to generate
MIN_BARS = 20
MAX_BARS = 300


def compute_waveform(
    samples: np.ndarray,
    *,
    duration: float | None = None,
    num_bars: int | None = None,
    normalize: bool = True,
) -> List[float]:
    """Compute a downsampled amplitude waveform from audio samples.

    Args:
        samples: Audio samples as float32 numpy array (typically -1.0 to 1.0).
        duration: Duration of the audio in seconds. Used to compute num_bars
            based on BARS_PER_SECOND. If not provided, num_bars must be set.
        num_bars: Number of amplitude bars to generate. If not provided,
            computed from duration * BARS_PER_SECOND.
        normalize: If True, normalize output to 0.0-1.0 range.

    Returns:
        List of floats representing RMS amplitude per time bucket.
    """
    # Compute num_bars from duration if not explicitly provided
    if num_bars is None:
        if duration is not None and duration > 0:
            num_bars = max(MIN_BARS, min(MAX_BARS, int(duration * BARS_PER_SECOND)))
        else:
            num_bars = MIN_BARS

    if samples.size == 0:
        return [0.0] * num_bars

    # Ensure we have at least num_bars samples
    if samples.size < num_bars:
        # Pad with zeros if audio is very short
        padded = np.zeros(num_bars, dtype=np.float32)
        padded[: samples.size] = samples
        samples = padded

    # Split into chunks and compute RMS for each
    chunk_size = samples.size // num_bars
    amplitudes: List[float] = []

    for i in range(num_bars):
        start = i * chunk_size
        # For the last chunk, include any remaining samples
        end = start + chunk_size if i < num_bars - 1 else samples.size
        chunk = samples[start:end]

        # Compute RMS (root mean square) for this chunk
        rms = float(np.sqrt(np.mean(chunk**2)))
        amplitudes.append(rms)

    if not normalize:
        return amplitudes

    # Normalize to 0.0-1.0 range
    max_amp = max(amplitudes) if amplitudes else 0.0
    if max_amp > 0:
        amplitudes = [amp / max_amp for amp in amplitudes]
    else:
        amplitudes = [0.0] * num_bars

    # Round to 3 decimal places to reduce JSON size
    return [round(amp, 3) for amp in amplitudes]


def compute_waveform_with_speech_markers(
    samples: np.ndarray,
    sample_rate: int,
    *,
    speech_start: Optional[float] = None,
    speech_end: Optional[float] = None,
    num_bars: int | None = None,
) -> dict:
    """Compute waveform with speech boundary markers.

    Args:
        samples: Audio samples as float32 numpy array.
        sample_rate: Sample rate of the audio.
        speech_start: Speech start offset in seconds.
        speech_end: Speech end offset in seconds.
        num_bars: Number of amplitude bars. If None, computed from duration.

    Returns:
        Dict with 'waveform' (list of amplitudes) and optional
        'speechStartBar' and 'speechEndBar' (bar indices).
    """
    duration = samples.size / sample_rate if sample_rate > 0 else 0.0
    waveform = compute_waveform(samples, duration=duration, num_bars=num_bars)
    actual_num_bars = len(waveform)

    result: dict = {"waveform": waveform}

    if duration > 0:
        if speech_start is not None:
            result["speechStartBar"] = int((speech_start / duration) * actual_num_bars)
        if speech_end is not None:
            result["speechEndBar"] = min(
                int((speech_end / duration) * actual_num_bars), actual_num_bars - 1
            )

    return result
