"""Audio front-end conditioning utilities."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np


@dataclass
class AudioFrontEndConfig:
    """Parameters that control the audio pre-processing chain."""

    sample_rate: int
    highpass_cutoff_hz: Optional[float] = 250.0
    lowpass_cutoff_hz: Optional[float] = 3800.0
    deemphasis_time_constant: Optional[float] = 75e-6
    agc_target_rms: Optional[float] = None
    agc_max_gain: float = 12.0


class AudioFrontEndProcessor:
    """Applies lightweight filters that improve speech intelligibility."""

    def __init__(self, config: AudioFrontEndConfig) -> None:
        self._config = config
        self._sample_rate = max(int(config.sample_rate), 1)
        dt = 1.0 / float(self._sample_rate)

        self._hp_alpha: Optional[float]
        cutoff = config.highpass_cutoff_hz
        if cutoff is None or cutoff <= 0.0:
            self._hp_alpha = None
        else:
            rc = 1.0 / (2.0 * np.pi * float(cutoff))
            self._hp_alpha = rc / (rc + dt)

        self._lp_alpha: Optional[float]
        cutoff = config.lowpass_cutoff_hz
        if cutoff is None or cutoff <= 0.0:
            self._lp_alpha = None
        else:
            rc = 1.0 / (2.0 * np.pi * float(cutoff))
            self._lp_alpha = dt / (rc + dt)

        self._de_alpha: Optional[float]
        time_constant = config.deemphasis_time_constant
        if time_constant is None or time_constant <= 0.0:
            self._de_alpha = None
        else:
            self._de_alpha = dt / (float(time_constant) + dt)

        self._hp_prev_input = 0.0
        self._hp_prev_output = 0.0
        self._de_prev_output = 0.0
        self._lp_prev_output = 0.0

    def reset(self) -> None:
        """Reset filter state to initial values.

        Call this when reconnecting a stream to avoid filter transients
        from stale state.
        """
        self._hp_prev_input = 0.0
        self._hp_prev_output = 0.0
        self._de_prev_output = 0.0
        self._lp_prev_output = 0.0

    def process(
        self, samples: np.ndarray, *, target_rms: Optional[float] = None
    ) -> np.ndarray:
        """Filter and normalise audio samples for Whisper."""

        processed = np.asarray(samples, dtype=np.float32).reshape(-1)
        if processed.size == 0:
            return processed

        if self._hp_alpha is not None:
            processed = self._apply_highpass(processed)
        if self._de_alpha is not None:
            processed = self._apply_deemphasis(processed)
        if self._lp_alpha is not None:
            processed = self._apply_lowpass(processed)

        return self._apply_agc(processed, target_rms)

    def _apply_highpass(self, samples: np.ndarray) -> np.ndarray:
        alpha = self._hp_alpha
        assert alpha is not None
        prev_out = float(self._hp_prev_output)
        prev_in = float(self._hp_prev_input)
        output = np.empty_like(samples)
        for index, value in enumerate(samples):
            prev_out = alpha * (prev_out + float(value) - prev_in)
            output[index] = prev_out
            prev_in = float(value)
        self._hp_prev_output = float(prev_out)
        self._hp_prev_input = float(prev_in)
        return output

    def _apply_deemphasis(self, samples: np.ndarray) -> np.ndarray:
        alpha = self._de_alpha
        assert alpha is not None
        prev_out = float(self._de_prev_output)
        output = np.empty_like(samples)
        for index, value in enumerate(samples):
            prev_out = prev_out + alpha * (float(value) - prev_out)
            output[index] = prev_out
        self._de_prev_output = float(prev_out)
        return output

    def _apply_lowpass(self, samples: np.ndarray) -> np.ndarray:
        alpha = self._lp_alpha
        assert alpha is not None
        prev_out = float(self._lp_prev_output)
        output = np.empty_like(samples)
        for index, value in enumerate(samples):
            prev_out = prev_out + alpha * (float(value) - prev_out)
            output[index] = prev_out
        self._lp_prev_output = float(prev_out)
        return output

    def _apply_agc(
        self, samples: np.ndarray, target_rms: Optional[float]
    ) -> np.ndarray:
        target = (
            float(target_rms)
            if target_rms is not None and target_rms > 0.0
            else float(self._config.agc_target_rms or 0.0)
        )
        if target <= 0.0:
            return samples

        rms = float(np.sqrt(np.mean(np.square(samples), dtype=np.float64)))
        if not np.isfinite(rms) or rms <= 0.0 or rms >= target:
            return samples

        gain = min(target / rms, float(self._config.agc_max_gain))
        boosted = samples.astype(np.float32, copy=True)
        boosted *= gain
        np.clip(boosted, -1.0, 1.0, out=boosted)
        return boosted


__all__ = ["AudioFrontEndConfig", "AudioFrontEndProcessor"]
