"""Lightweight software-defined radio helpers used by tests and legacy features.

This module intentionally avoids optional SoapySDR dependencies so it can run in
the constrained CI environment. It provides enough structure to exercise
demodulation math, squelch hysteresis, and channel accounting.
"""

from __future__ import annotations

import asyncio
import logging
import math
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Optional

import numpy as np

LOGGER = logging.getLogger(__name__)


@dataclass(slots=True)
class SdrChannelSpec:
    """Definition for a logical stream riding on an SDR device."""

    stream_id: str
    device_id: str
    frequency_hz: float
    mode: str = "nfm"
    bandwidth_hz: float = 15000.0
    squelch_dbfs: float = -60.0


def _candidate_sample_rates(
    requested: int, audio_rate: int, supported: Iterable[int]
) -> List[int]:
    """Return a prioritised list of sample rates to attempt for an SDR device."""

    attempts: List[int] = []
    if requested > 0:
        attempts.append(int(requested))

    for value in supported:
        value_int = int(value)
        if value_int > 0 and value_int not in attempts:
            attempts.append(value_int)

    heuristics = [
        int(audio_rate * 125),  # 16 kHz -> 2.0 MHz, common for integer decimation
        int(audio_rate * 200),
        int(audio_rate * 192),
        int(audio_rate),
    ]
    for value in heuristics:
        if value > 0 and value not in attempts:
            attempts.append(value)

    if not attempts:
        attempts.append(max(audio_rate, 1))
    return attempts


class _BaseDemodDecimator:
    def __init__(
        self,
        input_rate: int,
        audio_rate: int,
        audio_cutoff_hz: Optional[float] = None,
    ) -> None:
        self.input_rate = max(int(input_rate), 1)
        self.audio_rate = max(int(audio_rate), 1)
        self.audio_cutoff_hz = audio_cutoff_hz or None

    def _resample(self, samples: np.ndarray) -> np.ndarray:
        if samples.size == 0:
            return samples.astype(np.float32)
        if self.input_rate == self.audio_rate:
            return samples.astype(np.float32)
        step = self.input_rate / self.audio_rate
        indices = np.arange(0, samples.size, step)
        base = np.arange(samples.size)
        resampled = np.interp(indices, base, samples)
        return resampled.astype(np.float32)

    def _lowpass(self, samples: np.ndarray) -> np.ndarray:
        if not self.audio_cutoff_hz:
            return samples
        # Simple moving-average smoother; adequate for unit tests and avoids SciPy.
        window = max(int(self.input_rate / (self.audio_cutoff_hz * 2.0)), 1)
        if window <= 1:
            return samples
        kernel = np.ones(window, dtype=np.float32) / float(window)
        return np.convolve(samples, kernel, mode="same")


class _FMDemodDecimator(_BaseDemodDecimator):
    def process(self, iq: np.ndarray) -> np.ndarray:
        if iq.size == 0:
            return np.zeros(0, dtype=np.float32)
        iq = np.asarray(iq, dtype=np.complex64)
        multiplied = iq[1:] * np.conj(iq[:-1])
        discriminator = np.angle(multiplied)
        discriminator = np.concatenate(
            (np.array([discriminator[0]], dtype=np.float32), discriminator.astype(np.float32))
        )
        filtered = self._lowpass(discriminator)
        return self._resample(filtered)


class _AMDemodDecimator(_BaseDemodDecimator):
    def process(self, iq: np.ndarray) -> np.ndarray:
        if iq.size == 0:
            return np.zeros(0, dtype=np.float32)
        iq = np.asarray(iq, dtype=np.complex64)
        envelope = np.abs(iq).astype(np.float32)
        envelope -= float(np.mean(envelope))
        peak = float(np.max(np.abs(envelope))) or 1.0
        normalised = envelope / peak
        filtered = self._lowpass(normalised)
        return self._resample(filtered)


class _ChannelDemod:
    """Miniature demodulator wrapper with squelch hysteresis for tests."""

    def __init__(
        self,
        stream_id: str,
        input_rate: int,
        audio_rate: int,
        abs_frequency_hz: float,
        center_frequency_hz: float,
        mode: str,
        bandwidth_hz: float,
        squelch_dbfs: float,
    ) -> None:
        self.stream_id = stream_id
        self.input_rate = input_rate
        self.audio_rate = audio_rate
        self.abs_frequency_hz = abs_frequency_hz
        self.center_frequency_hz = center_frequency_hz
        self.mode = mode
        self.bandwidth_hz = bandwidth_hz
        self._squelch_threshold_dbfs = float(squelch_dbfs)
        self._squelch_close_dbfs = self._squelch_threshold_dbfs - 3.0
        self._squelch_open = False

    def _squelch_allows(self, level_dbfs: float) -> bool:
        """Return whether the channel is open for the provided level."""

        level = float(level_dbfs)
        if self._squelch_open:
            if level < self._squelch_close_dbfs:
                self._squelch_open = False
        else:
            if level > self._squelch_threshold_dbfs:
                self._squelch_open = True
        return self._squelch_open


def _clamp_lo_offset(
    requested_hz: Optional[float], sample_rate_hz: float, bandwidth_hz: float
) -> float:
    guard_hz = max(sample_rate_hz * 0.02, 5000.0)
    max_offset = max((sample_rate_hz / 2.0) - (bandwidth_hz / 2.0) - guard_hz, 0.0)
    desired = float(requested_hz or 0.0)
    return float(np.clip(desired, -max_offset, max_offset))


class _DeviceWorker:
    """Lightweight stand-in for a full SDR worker loop."""

    def __init__(
        self,
        device_id: str,
        soapy_args: str,
        sample_rate_hz: int,
        audio_sample_rate: int,
        gain_db: Optional[float],
        gain_mode: Optional[str],
        rf_bandwidth_hz: Optional[float],
        antenna: Optional[str],
        ppm_correction: Optional[float],
        lo_offset_hz: Optional[float],
    ) -> None:
        self.device_id = device_id
        self.soapy_args = soapy_args
        self.sample_rate_hz = float(sample_rate_hz)
        self.audio_sample_rate = int(audio_sample_rate)
        self.gain_db = gain_db
        self.gain_mode = gain_mode
        self.rf_bandwidth_hz = rf_bandwidth_hz
        self.antenna = antenna
        self.ppm_correction = ppm_correction
        self._requested_lo_offset_hz = lo_offset_hz
        self._lo_offset_hz = float(lo_offset_hz or 0.0)
        self._channels: Dict[str, SdrChannelSpec] = {}

    async def add_channel(self, spec: SdrChannelSpec) -> None:
        self._lo_offset_hz = _clamp_lo_offset(
            self._requested_lo_offset_hz, self.sample_rate_hz, spec.bandwidth_hz
        )
        self._channels[spec.stream_id] = spec
        await asyncio.sleep(0)  # Yield control to mimic async I/O.

    def describe(self) -> Dict[str, Optional[float]]:
        return {
            "deviceId": self.device_id,
            "sampleRateHz": self.sample_rate_hz,
            "audioSampleRate": self.audio_sample_rate,
            "gainDb": self.gain_db,
            "gainMode": self.gain_mode,
            "rfBandwidthHz": self.rf_bandwidth_hz,
            "antenna": self.antenna,
            "ppmCorrection": self.ppm_correction,
            "loOffsetHz": self._lo_offset_hz,
            "configuredChannels": len(self._channels),
        }


class SdrManager:
    """Container for configured SDR devices."""

    def __init__(self, audio_sample_rate: int = 16000):
        self.audio_sample_rate = int(audio_sample_rate)
        self._workers: Dict[str, _DeviceWorker] = {}
        self._lock = asyncio.Lock()

    def configure_device(
        self,
        device_id: str,
        soapy_args: str,
        sample_rate_hz: int,
        gain_db: Optional[float] = None,
        gain_mode: Optional[str] = None,
        rf_bandwidth_hz: Optional[float] = None,
        antenna: Optional[str] = None,
        ppm_correction: Optional[float] = None,
        lo_offset_hz: Optional[float] = None,
    ) -> None:
        worker = _DeviceWorker(
            device_id=device_id,
            soapy_args=soapy_args,
            sample_rate_hz=sample_rate_hz,
            audio_sample_rate=self.audio_sample_rate,
            gain_db=gain_db,
            gain_mode=gain_mode,
            rf_bandwidth_hz=rf_bandwidth_hz,
            antenna=antenna,
            ppm_correction=ppm_correction,
            lo_offset_hz=lo_offset_hz,
        )
        self._workers[device_id] = worker

    async def add_channel(self, spec: SdrChannelSpec) -> None:
        async with self._lock:
            worker = self._workers.get(spec.device_id)
            if worker is None:
                raise ValueError(f"Device {spec.device_id} is not configured")
        await worker.add_channel(spec)

    async def get_status(self) -> Dict[str, List[Dict[str, Optional[float]]]]:
        async with self._lock:
            devices = [worker.describe() for worker in self._workers.values()]
        return {"configuredDevices": devices}


__all__ = [
    "SdrChannelSpec",
    "SdrManager",
    "_AMDemodDecimator",
    "_ChannelDemod",
    "_DeviceWorker",
    "_FMDemodDecimator",
    "_candidate_sample_rates",
]
