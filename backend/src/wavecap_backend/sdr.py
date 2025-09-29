"""Minimal SDR manager with SoapySDR-based NFM demodulation.

This module provides a small, decoupled interface the rest of the backend can
use to obtain 16 kHz mono PCM from local SDR devices. It is intentionally
lightweight and keeps its own lifecycle separate from stream workers so that a
future split to a dedicated service is straightforward.
"""

from __future__ import annotations

import asyncio
import logging
import math
import threading
import time
from dataclasses import dataclass
from typing import Dict, Optional, Tuple, Any, Sequence

import numpy as np

try:  # Optional dependency; graceful runtime fallback
    import SoapySDR  # type: ignore
    from SoapySDR import SOAPY_SDR_CF32, SOAPY_SDR_RX  # type: ignore
except Exception:  # pragma: no cover - runtime environment dependent
    SoapySDR = None  # type: ignore
    SOAPY_SDR_CF32 = None  # type: ignore
    SOAPY_SDR_RX = None  # type: ignore

LOGGER = logging.getLogger(__name__)


_DEFAULT_CHANNEL_BANDWIDTHS = {
    "nfm": 15000.0,
    "wfm": 180000.0,
    "am": 10000.0,
}

_DEFAULT_AUDIO_CUTOFFS = {
    "nfm": 3800.0,
    "wfm": 6500.0,
    "am": 4500.0,
}

_DEFAULT_SQUELCH_DBFS = {
    "nfm": -75.0,
    "wfm": -68.0,
    "am": -72.0,
}


def _candidate_sample_rates(
    requested_rate: int, audio_rate: int, supported: Sequence[int]
) -> list[int]:
    """Generate a prioritised list of SDR sample-rate attempts.

    The sequence always begins with the requested rate (when valid), followed by
    supported values ordered by proximity, and finally heuristic fallbacks that
    are known to work with common devices such as the RSP family.
    """

    attempts: list[int] = []

    def _add(rate: int) -> None:
        if rate <= 0:
            return
        if rate not in attempts:
            attempts.append(int(rate))

    if requested_rate > 0:
        _add(int(requested_rate))

    for rate in sorted({int(r) for r in supported if int(r) > 0}, key=lambda v: (abs(v - requested_rate), v)):
        _add(rate)

    heuristic_multipliers = (125, 96, 64, 48, 32)
    for multiplier in heuristic_multipliers:
        heuristic_rate = audio_rate * multiplier
        if heuristic_rate >= audio_rate:
            _add(heuristic_rate)

    _add(audio_rate)

    return attempts


def _design_lowpass_fir(taps: int, cutoff_norm: float) -> np.ndarray:
    taps = max(int(taps), 3)
    if cutoff_norm <= 0.0:
        fir = np.zeros(taps, dtype=np.float32)
        fir[(taps - 1) // 2] = 1.0
        return fir
    if cutoff_norm >= 1.0:
        fir = np.zeros(taps, dtype=np.float32)
        fir[(taps - 1) // 2] = 1.0
        return fir
    indices = np.arange(taps)
    n = indices - (taps - 1) / 2.0
    h = np.sinc(cutoff_norm * n)
    window = 0.54 - 0.46 * np.cos(2 * np.pi * (indices / (taps - 1)))
    fir = (h * window).astype(np.float32)
    scale = np.sum(fir)
    if scale != 0.0:
        fir /= scale
    return fir


# Public API -----------------------------------------------------------------


@dataclass(frozen=True)
class SdrChannelSpec:
    stream_id: str
    device_id: str
    frequency_hz: int
    mode: str = "nfm"
    bandwidth_hz: Optional[int] = None
    squelch_dbfs: Optional[float] = None


class SdrUnavailableError(RuntimeError):
    pass


class SdrAudioChannel:
    """Async adapter exposing PCM bytes for a registered SDR channel."""

    def __init__(self, queue: "asyncio.Queue[bytes]", on_close) -> None:
        self._queue = queue
        self._on_close = on_close
        self._closed = False

    async def read(self, max_wait_seconds: float = 0.5) -> Optional[bytes]:
        if self._closed:
            return None
        try:
            return await asyncio.wait_for(self._queue.get(), timeout=max_wait_seconds)
        except asyncio.TimeoutError:
            return b""

    async def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        await self._on_close()


@dataclass(frozen=True)
class _DeviceConfig:
    soapy_args: str
    sample_rate_hz: int
    gain_db: Optional[float]
    gain_mode: Optional[str]
    rf_bandwidth_hz: Optional[float]
    antenna: Optional[str]
    ppm_correction: Optional[float]
    lo_offset_hz: Optional[float]


class SdrManager:
    """Coordinates SDR device workers and channel registration."""

    def __init__(self) -> None:
        self._devices: Dict[str, _DeviceWorker] = {}
        self._device_configs: Dict[str, _DeviceConfig] = {}
        self._stream_specs: Dict[str, SdrChannelSpec] = {}
        self._lock = asyncio.Lock()

    def configure_device(
        self,
        device_id: str,
        soapy_args: str,
        sample_rate_hz: int,
        gain_db: Optional[float],
        *,
        gain_mode: Optional[str] = None,
        rf_bandwidth_hz: Optional[float] = None,
        antenna: Optional[str] = None,
        ppm_correction: Optional[float] = None,
        lo_offset_hz: Optional[float] = None,
    ) -> None:
        self._device_configs[device_id] = _DeviceConfig(
            soapy_args=soapy_args,
            sample_rate_hz=int(sample_rate_hz),
            gain_db=gain_db,
            gain_mode=(gain_mode.strip().lower() if isinstance(gain_mode, str) else None),
            rf_bandwidth_hz=(float(rf_bandwidth_hz) if rf_bandwidth_hz is not None else None),
            antenna=antenna,
            ppm_correction=(float(ppm_correction) if ppm_correction is not None else None),
            lo_offset_hz=(float(lo_offset_hz) if lo_offset_hz is not None else None),
        )

    async def open_channel(
        self, spec: SdrChannelSpec, audio_sample_rate: int
    ) -> SdrAudioChannel:
        if SoapySDR is None:  # pragma: no cover - environment dependent
            raise SdrUnavailableError(
                "SoapySDR Python module not available. Install python3-soapysdr and the SDRplay plugin on the host/container."
            )
        async with self._lock:
            worker = self._devices.get(spec.device_id)
            if worker is None:
                config = self._device_configs.get(spec.device_id)
                if config is None:
                    raise ValueError(f"Unknown SDR device id: {spec.device_id}")
                soapy_args = config.soapy_args
                sample_rate_hz = config.sample_rate_hz
                gain_db = config.gain_db
                worker = _DeviceWorker(
                    device_id=spec.device_id,
                    soapy_args=soapy_args,
                    sample_rate_hz=sample_rate_hz,
                    gain_db=gain_db,
                    audio_sample_rate=audio_sample_rate,
                    gain_mode=config.gain_mode,
                    rf_bandwidth_hz=config.rf_bandwidth_hz,
                    antenna=config.antenna,
                    ppm_correction=config.ppm_correction,
                    lo_offset_hz=config.lo_offset_hz,
                )
                await worker.start()
                self._devices[spec.device_id] = worker
            queue = await worker.add_channel(spec)

        async def _on_close() -> None:
            async with self._lock:
                dw = self._devices.get(spec.device_id)
            if dw:
                await dw.remove_channel(spec.stream_id)
                async with self._lock:
                    if dw.is_idle():
                        await dw.stop()
                        self._devices.pop(spec.device_id, None)

        return SdrAudioChannel(queue, _on_close)

    # Registry helpers -------------------------------------------------
    def register_stream_spec(self, spec: SdrChannelSpec) -> None:
        self._stream_specs[spec.stream_id] = spec

    def unregister_stream_spec(self, stream_id: str) -> None:
        self._stream_specs.pop(stream_id, None)

    def get_stream_spec(self, stream_id: str) -> Optional[SdrChannelSpec]:
        return self._stream_specs.get(stream_id)

    async def get_status(self) -> Dict[str, Any]:
        async with self._lock:
            device_items = list(self._devices.items())
            configs = dict(self._device_configs)
        statuses = []
        for device_id, worker in device_items:
            try:
                snapshot = await worker.status_snapshot()
            except Exception as exc:  # pragma: no cover - defensive
                LOGGER.debug("Failed to read status for device %s: %s", device_id, exc)
                continue
            statuses.append(snapshot)
        configured = []
        for device_id, cfg in configs.items():
            configured.append(
                {
                    "deviceId": device_id,
                    "soapy": cfg.soapy_args,
                    "sampleRateHz": cfg.sample_rate_hz,
                    "gainDb": cfg.gain_db,
                    "gainMode": cfg.gain_mode,
                    "rfBandwidthHz": cfg.rf_bandwidth_hz,
                    "antenna": cfg.antenna,
                    "ppmCorrection": cfg.ppm_correction,
                    "loOffsetHz": cfg.lo_offset_hz,
                }
            )
        return {"activeDevices": statuses, "configuredDevices": configured}


# Implementation --------------------------------------------------------------


class _FMDemodDecimator:
    """Stateful FM discriminator followed by low-pass + integer decimator."""

    def __init__(self, input_rate: int, audio_rate: int, audio_cutoff_hz: float) -> None:
        if input_rate % audio_rate != 0:
            raise ValueError("input_rate must be an integer multiple of audio_rate")
        self._input_rate = int(input_rate)
        self._audio_rate = int(audio_rate)
        self._decim = self._input_rate // self._audio_rate
        cutoff_hz = min(float(audio_cutoff_hz), 0.48 * self._input_rate)
        nyq = 0.5 * self._input_rate
        norm = cutoff_hz / nyq if nyq > 0 else 0.0
        taps = 127  # keep small for CPU
        self._fir = _design_lowpass_fir(taps, norm)
        self._prev_iq: complex = 0 + 0j
        self._lp_tail = np.zeros(self._fir.size - 1, dtype=np.float32)

    def process(self, iq: np.ndarray) -> np.ndarray:
        if iq.size == 0:
            return np.empty(0, dtype=np.float32)
        # Quadrature discriminator: angle(conj(x[n-1]) * x[n])
        x = iq.astype(np.complex64, copy=False)
        prev = self._prev_iq
        # Compute phase differences
        prod = x * np.conj(np.concatenate(([prev], x[:-1])))
        demod = np.angle(prod).astype(np.float32)
        self._prev_iq = complex(x[-1])
        # Lowpass filter
        y = np.convolve(demod, self._fir, mode="full")
        # Overlap-save
        y[: self._lp_tail.size] += self._lp_tail
        self._lp_tail = y[-(self._fir.size - 1) :].copy()
        y = y[self._fir.size - 1 :]
        # Decimate
        decimated = y[:: self._decim]
        # Clamp to [-1, 1]
        np.clip(decimated, -1.0, 1.0, out=decimated)
        return decimated


class _AMDemodDecimator:
    """Envelope detector + low-pass + integer decimator for AM signals."""

    def __init__(self, input_rate: int, audio_rate: int, audio_cutoff_hz: float) -> None:
        if input_rate % audio_rate != 0:
            raise ValueError("input_rate must be an integer multiple of audio_rate")
        self._input_rate = int(input_rate)
        self._audio_rate = int(audio_rate)
        self._decim = self._input_rate // self._audio_rate
        cutoff_hz = min(float(audio_cutoff_hz), 0.48 * self._input_rate)
        nyq = 0.5 * self._input_rate
        norm = cutoff_hz / nyq if nyq > 0 else 0.0
        taps = 127
        self._fir = _design_lowpass_fir(taps, norm)
        self._lp_tail = np.zeros(self._fir.size - 1, dtype=np.float32)

    def process(self, iq: np.ndarray) -> np.ndarray:
        if iq.size == 0:
            return np.empty(0, dtype=np.float32)
        env = np.abs(iq.astype(np.complex64))
        env -= np.mean(env)
        y = np.convolve(env.astype(np.float32), self._fir, mode="full")
        y[: self._lp_tail.size] += self._lp_tail
        self._lp_tail = y[-(self._fir.size - 1) :].copy()
        y = y[self._fir.size - 1 :]
        decimated = y[:: self._decim]
        peak = float(np.max(np.abs(decimated))) if decimated.size else 0.0
        if peak > 0:
            decimated = decimated / peak
        np.clip(decimated, -1.0, 1.0, out=decimated)
        return decimated.astype(np.float32, copy=False)


class _ComplexLowpass:
    """Streamed complex low-pass filter with overlap-save."""

    def __init__(self, sample_rate: int, cutoff_hz: Optional[float], taps: int = 129) -> None:
        self._enabled = bool(cutoff_hz) and cutoff_hz is not None and cutoff_hz > 0.0
        self._fir: np.ndarray
        if self._enabled:
            nyq = 0.5 * float(sample_rate)
            norm = min(float(cutoff_hz) / nyq if nyq > 0 else 0.0, 0.999)
            self._fir = _design_lowpass_fir(taps, norm)
        else:
            self._fir = np.zeros(taps, dtype=np.float32)
            self._fir[(taps - 1) // 2] = 1.0
        self._tail = np.zeros(self._fir.size - 1, dtype=np.complex64)

    def process(self, iq: np.ndarray) -> np.ndarray:
        if iq.size == 0:
            return np.empty(0, dtype=np.complex64)
        if not self._enabled:
            return iq.astype(np.complex64, copy=False)
        data = iq.astype(np.complex64, copy=False)
        y = np.convolve(data, self._fir.astype(np.float32), mode="full")
        y[: self._tail.size] += self._tail
        self._tail = y[-(self._fir.size - 1) :].astype(np.complex64, copy=True)
        filtered = y[self._fir.size - 1 :].astype(np.complex64, copy=False)
        return filtered


class _ChannelDemod:
    def __init__(
        self,
        stream_id: str,
        input_rate: int,
        audio_rate: int,
        abs_frequency_hz: float,
        center_frequency_hz: float,
        *,
        mode: Optional[str],
        bandwidth_hz: Optional[int],
        squelch_dbfs: Optional[float],
    ) -> None:
        self.stream_id = stream_id
        self._input_rate = float(input_rate)
        self._audio_rate = int(audio_rate)
        self._abs_freq = float(abs_frequency_hz)
        self._freq_offset = float(abs_frequency_hz - center_frequency_hz)
        self._phase = 0.0
        self._twopi = 2.0 * math.pi
        self._queue: "asyncio.Queue[bytes]" = asyncio.Queue(maxsize=32)
        self._mode = (mode or "nfm").strip().lower()
        if self._mode not in {"nfm", "wfm", "am"}:
            LOGGER.warning("Stream %s requested unsupported mode %s; falling back to nfm", stream_id, mode)
            self._mode = "nfm"
        self._channel_bandwidth = self._resolve_channel_bandwidth(bandwidth_hz)
        self._channel_filter = _ComplexLowpass(int(self._input_rate), self._channel_bandwidth / 2.0 if self._channel_bandwidth else None)
        audio_cutoff = _DEFAULT_AUDIO_CUTOFFS.get(self._mode, 3800.0)
        if self._mode == "wfm":
            audio_cutoff = min(audio_cutoff, 0.48 * self._audio_rate)
        self._demod = self._build_demodulator(audio_cutoff)
        default_squelch = _DEFAULT_SQUELCH_DBFS.get(self._mode, -75.0)
        self._squelch_dbfs = float(squelch_dbfs) if squelch_dbfs is not None else default_squelch
        if self._squelch_dbfs > 0.0:
            self._squelch_dbfs = 0.0
        self._squelch_open = False
        self._squelch_hysteresis_db = 3.0
        self._last_audio_rms = 0.0
        self._last_audio_dbfs = float("-inf")
        self._last_update = 0.0

    def _resolve_channel_bandwidth(self, override: Optional[int]) -> float:
        if override is not None and override > 0:
            return float(override)
        default = _DEFAULT_CHANNEL_BANDWIDTHS.get(self._mode, 15000.0)
        # Keep a guard band relative to Nyquist so the FIR stays stable
        max_bw = max(self._input_rate * 0.9, 1.0)
        return float(min(default, max_bw))

    def _build_demodulator(self, audio_cutoff_hz: float):
        if self._mode == "am":
            return _AMDemodDecimator(int(self._input_rate), self._audio_rate, audio_cutoff_hz)
        # Treat wfm identically to nfm but with a wider channel filter; Whisper still expects 16 kHz audio
        return _FMDemodDecimator(int(self._input_rate), self._audio_rate, audio_cutoff_hz)

    def update_offset(self, freq_offset_hz: float) -> None:
        self._freq_offset = float(freq_offset_hz)

    def _mix_down(self, iq: np.ndarray) -> np.ndarray:
        if iq.size == 0:
            return iq
        n = np.arange(iq.size, dtype=np.float32)
        phase_inc = self._twopi * self._freq_offset / self._input_rate
        phase = self._phase + phase_inc * n
        osc = np.exp(-1j * phase).astype(np.complex64)
        mixed = iq.astype(np.complex64) * osc
        filtered = self._channel_filter.process(mixed)
        # Keep phase continuous across chunks
        self._phase = float((phase[-1] + phase_inc) % self._twopi)
        return filtered

    def _update_metrics(self, audio: np.ndarray) -> None:
        rms = float(np.sqrt(np.mean(np.square(audio), dtype=np.float64))) if audio.size else 0.0
        self._last_audio_rms = rms
        dbfs = -200.0
        if rms > 0.0:
            dbfs = 20.0 * math.log10(max(rms, 1e-12))
        self._last_audio_dbfs = dbfs
        self._last_update = time.time()

    def _squelch_allows(self, dbfs: float) -> bool:
        if self._squelch_dbfs is None:
            return True
        if not self._squelch_open:
            if dbfs >= self._squelch_dbfs:
                self._squelch_open = True
                LOGGER.debug("SDR stream %s squelch opened at %.1f dBFS", self.stream_id, dbfs)
        else:
            close_threshold = self._squelch_dbfs - self._squelch_hysteresis_db
            if dbfs < close_threshold:
                self._squelch_open = False
                LOGGER.debug("SDR stream %s squelch closed at %.1f dBFS", self.stream_id, dbfs)
        return self._squelch_open

    async def feed(self, iq: np.ndarray) -> None:
        demod_input = self._mix_down(iq)
        audio = self._demod.process(demod_input)
        if audio.size == 0:
            self._update_metrics(audio)
            return
        self._update_metrics(audio)
        if not self._squelch_allows(self._last_audio_dbfs):
            return
        # Convert to s16le PCM bytes
        i16 = np.clip(np.round(audio * 32767.0), -32768, 32767).astype(np.int16)
        data = i16.tobytes()
        try:
            self._queue.put_nowait(data)
        except asyncio.QueueFull:
            try:
                _ = self._queue.get_nowait()
                self._queue.task_done()
            except asyncio.QueueEmpty:
                return
            else:
                try:
                    self._queue.put_nowait(data)
                except asyncio.QueueFull:
                    return

    def queue(self) -> "asyncio.Queue[bytes]":
        return self._queue

    def status_snapshot(self) -> Dict[str, Any]:
        return {
            "streamId": self.stream_id,
            "frequencyHz": self._abs_freq,
            "mode": self._mode,
            "bandwidthHz": self._channel_bandwidth,
            "squelchDbFs": self._squelch_dbfs,
            "lastAudioRms": self._last_audio_rms,
            "lastAudioDbFs": self._last_audio_dbfs,
            "squelchOpen": self._squelch_open,
            "lastUpdated": self._last_update,
        }


class _DeviceWorker:
    def __init__(
        self,
        *,
        device_id: str,
        soapy_args: str,
        sample_rate_hz: int,
        gain_db: Optional[float],
        audio_sample_rate: int,
        gain_mode: Optional[str],
        rf_bandwidth_hz: Optional[float],
        antenna: Optional[str],
        ppm_correction: Optional[float],
        lo_offset_hz: Optional[float],
    ) -> None:
        self.device_id = device_id
        self.soapy_args = soapy_args
        self.sample_rate_hz = int(sample_rate_hz)
        self.audio_sample_rate = int(audio_sample_rate)
        self.gain_db = gain_db
        self.gain_mode = gain_mode
        self.rf_bandwidth_hz = rf_bandwidth_hz
        self.antenna = antenna
        self.ppm_correction = ppm_correction
        self._configured_lo_offset_hz = float(lo_offset_hz) if lo_offset_hz is not None else None
        self._lo_offset_hz = self._configured_lo_offset_hz or 0.0
        self._dev = None
        self._stream = None
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._stop = threading.Event()
        self._channels: Dict[str, _ChannelDemod] = {}
        self._center_hz: Optional[float] = None
        self._logical_center_hz: Optional[float] = None
        self._lock = asyncio.Lock()
        self._metrics_lock = threading.Lock()
        self._iq_rms: float = 0.0
        self._iq_peak: float = 0.0
        self._last_chunk_ts: float = 0.0
        self._total_samples: int = 0

    async def start(self) -> None:
        if self._running:
            return
        # Initialize device in a thread to avoid blocking loop
        self._loop = asyncio.get_running_loop()
        await asyncio.to_thread(self._init_device)
        self._stop.clear()
        self._thread = threading.Thread(target=self._reader_loop, name=f"sdr-{self.device_id}", daemon=True)
        self._thread.start()
        self._running = True

    async def stop(self) -> None:
        if not self._running:
            return
        self._stop.set()
        if self._thread:
            self._thread.join(timeout=3.0)
        await asyncio.to_thread(self._shutdown_device)
        self._running = False

    def is_idle(self) -> bool:
        return not self._channels

    async def add_channel(self, spec: SdrChannelSpec) -> "asyncio.Queue[bytes]":
        async with self._lock:
            # If no center yet, use this channel's frequency
            if self._center_hz is None:
                tuned_center = self._tune(float(spec.frequency_hz))
            else:
                tuned_center = self._recompute_center_frequency(add_freq=float(spec.frequency_hz))
            center = float((self._center_hz or tuned_center or spec.frequency_hz))
            chan = _ChannelDemod(
                spec.stream_id,
                self.sample_rate_hz,
                self.audio_sample_rate,
                float(spec.frequency_hz),
                center,
                mode=spec.mode,
                bandwidth_hz=spec.bandwidth_hz,
                squelch_dbfs=spec.squelch_dbfs,
            )
            self._channels[spec.stream_id] = chan
        return chan.queue()

    async def remove_channel(self, stream_id: str) -> None:
        async with self._lock:
            self._channels.pop(stream_id, None)
            self._recompute_center_frequency()

    async def status_snapshot(self) -> Dict[str, Any]:
        async with self._lock:
            center = self._center_hz
            logical_center = self._logical_center_hz
            channels = {stream_id: chan.status_snapshot() for stream_id, chan in self._channels.items()}
            running = self._running
        with self._metrics_lock:
            iq_rms = self._iq_rms
            iq_peak = self._iq_peak
            last_chunk = self._last_chunk_ts
            total_samples = self._total_samples
        iq_dbfs = -200.0
        if iq_rms > 0.0:
            iq_dbfs = 20.0 * math.log10(max(iq_rms, 1e-12))
        return {
            "deviceId": self.device_id,
            "running": running,
            "sampleRateHz": self.sample_rate_hz,
            "audioSampleRateHz": self.audio_sample_rate,
            "gainDb": self.gain_db,
            "gainMode": self.gain_mode,
            "rfBandwidthHz": self.rf_bandwidth_hz,
            "antenna": self.antenna,
            "ppmCorrection": self.ppm_correction,
            "loOffsetHz": self._configured_lo_offset_hz,
            "tunedFrequencyHz": center,
            "logicalCenterFrequencyHz": logical_center,
            "iqRms": iq_rms,
            "iqPeak": iq_peak,
            "iqDbFs": iq_dbfs,
            "lastSampleTimestamp": last_chunk,
            "totalSamples": total_samples,
            "channels": channels,
        }

    # Internal ----------------------------------------------------------------

    def _init_device(self) -> None:
        assert SoapySDR is not None  # noqa: S101
        self._dev = SoapySDR.Device(self.soapy_args)
        configured_rate = self._configure_sample_rate()
        if configured_rate != self.sample_rate_hz:
            LOGGER.warning(
                "SDR %s adjusted sample rate from %d Hz to %d Hz",
                self.device_id,
                self.sample_rate_hz,
                configured_rate,
            )
        self.sample_rate_hz = configured_rate
        if self.ppm_correction is not None:
            try:
                self._dev.setFrequencyCorrection(SOAPY_SDR_RX, 0, float(self.ppm_correction))
            except Exception:  # pragma: no cover - device specific
                LOGGER.warning("Setting SDR frequency correction unsupported; continuing")
        if self.gain_db is not None:
            try:
                self._dev.setGain(SOAPY_SDR_RX, 0, float(self.gain_db))
            except Exception:  # pragma: no cover - device specific
                LOGGER.warning("Setting SDR gain unsupported; continuing")
        if self.gain_mode is not None:
            try:
                automatic = self.gain_mode == "auto"
                self._dev.setGainMode(SOAPY_SDR_RX, 0, bool(automatic))
            except Exception:  # pragma: no cover - device specific
                LOGGER.warning("Setting SDR gain mode unsupported; continuing")
        if self.rf_bandwidth_hz is not None:
            try:
                self._dev.setBandwidth(SOAPY_SDR_RX, 0, float(self.rf_bandwidth_hz))
            except Exception:  # pragma: no cover - device specific
                LOGGER.warning("Setting SDR RF bandwidth unsupported; continuing")
        if self.antenna:
            try:
                self._dev.setAntenna(SOAPY_SDR_RX, 0, str(self.antenna))
            except Exception:  # pragma: no cover - device specific
                LOGGER.warning("Selecting SDR antenna unsupported; continuing")
        # Delay setting center frequency until we know the first channel
        self._stream = self._dev.setupStream(SOAPY_SDR_RX, SOAPY_SDR_CF32)
        self._dev.activateStream(self._stream)

    def _shutdown_device(self) -> None:
        try:
            if self._dev and self._stream:
                self._dev.deactivateStream(self._stream)
                self._dev.closeStream(self._stream)
        finally:
            self._stream = None
            self._dev = None

    def _tune(self, center_hz: float) -> float:
        if not self._dev:
            return float(center_hz)
        desired = float(center_hz)
        tuned = desired + self._lo_offset_hz
        if self._center_hz is None or abs(tuned - self._center_hz) > 1.0:
            try:
                self._dev.setFrequency(SOAPY_SDR_RX, 0, tuned)
                self._center_hz = tuned
                self._logical_center_hz = desired
                LOGGER.info(
                    "SDR %s tuned to %.0f Hz (logical %.0f Hz, LO offset %.0f Hz)",
                    self.device_id,
                    tuned,
                    desired,
                    self._lo_offset_hz,
                )
            except Exception as exc:  # pragma: no cover - hardware dependent
                LOGGER.error("Failed to tune SDR %s: %s", self.device_id, exc)
        return self._center_hz or tuned

    def _recompute_center_frequency(self, add_freq: Optional[float] = None) -> float:
        if add_freq is None and not self._channels:
            return self._center_hz or 0.0
        freqs = []
        if add_freq is not None:
            freqs.append(float(add_freq))
        for chan in self._channels.values():
            # Use absolute channel frequency tracked by the demod
            freqs.append(float(chan._abs_freq))  # noqa: SLF001 - internal
        if not freqs:
            return self._center_hz or 0.0
        new_center = float(sum(freqs) / len(freqs))
        span = float(max(freqs) - min(freqs))
        # Ensure configured sample rate covers span with margin
        if span > (self.sample_rate_hz * 0.8):
            LOGGER.warning(
                "Configured sample rate %d Hz may be too low for %.0f Hz span; channels may clip",
                self.sample_rate_hz,
                span,
            )
        tuned = self._tune(new_center)
        # Update offsets
        for chan in self._channels.values():
            chan.update_offset(float(chan._abs_freq) - tuned)  # noqa: SLF001
        return tuned

    def _configure_sample_rate(self) -> int:
        assert self._dev is not None  # noqa: S101
        attempts = _candidate_sample_rates(
            self.sample_rate_hz,
            self.audio_sample_rate,
            self._gather_supported_sample_rates(),
        )
        for candidate in attempts:
            actual = self._apply_sample_rate(candidate)
            if self._sample_rate_is_valid(actual):
                return actual
        LOGGER.error(
            "SDR %s failed to accept any sample rate; falling back to %d Hz",
            self.device_id,
            self.audio_sample_rate,
        )
        return self.audio_sample_rate

    def _sample_rate_is_valid(self, rate: int) -> bool:
        if rate <= 0:
            return False
        return rate % self.audio_sample_rate == 0

    def _apply_sample_rate(self, rate: int) -> int:
        assert self._dev is not None  # noqa: S101
        if rate <= 0:
            return 0
        try:
            self._dev.setSampleRate(SOAPY_SDR_RX, 0, float(rate))
        except Exception as exc:  # pragma: no cover - hardware specific
            LOGGER.debug(
                "SDR %s rejected sample rate %d Hz: %s",
                self.device_id,
                rate,
                exc,
            )
        actual = rate
        try:
            actual = self._dev.getSampleRate(SOAPY_SDR_RX, 0)
        except Exception as exc:  # pragma: no cover - hardware specific
            LOGGER.debug(
                "SDR %s could not report current sample rate: %s",
                self.device_id,
                exc,
            )
        try:
            return int(round(float(actual)))
        except (TypeError, ValueError):  # pragma: no cover - defensive
            return 0

    def _gather_supported_sample_rates(self) -> list[int]:
        assert self._dev is not None  # noqa: S101
        candidates: list[int] = []
        list_rates: Sequence[Any] = []
        if hasattr(self._dev, "listSampleRates"):
            try:
                list_rates = self._dev.listSampleRates(SOAPY_SDR_RX, 0)
            except Exception:  # pragma: no cover - hardware specific
                list_rates = []
        for value in list_rates:
            try:
                rate = int(round(float(value)))
            except (TypeError, ValueError):
                continue
            if rate > 0:
                candidates.append(rate)
        return sorted(set(candidates))

    def _reader_loop(self) -> None:
        assert self._dev is not None and self._stream is not None
        buf_len = max(8192, self.sample_rate_hz // 10)
        buff = np.empty(buf_len, dtype=np.complex64)
        loop = getattr(self, "_loop", None)
        while not self._stop.is_set():
            try:
                sr = self._dev.readStream(self._stream, [buff], buf_len)
                if isinstance(sr, tuple):
                    _, length = sr[:2]
                else:
                    length = int(sr)
                if length <= 0:
                    continue
                chunk = buff[:length].copy()
            except Exception:  # pragma: no cover - driver dependent
                continue
            magnitudes = np.abs(chunk)
            rms = float(np.sqrt(np.mean(np.square(magnitudes), dtype=np.float64))) if magnitudes.size else 0.0
            peak = float(np.max(magnitudes)) if magnitudes.size else 0.0
            now_ts = time.time()
            with self._metrics_lock:
                if self._iq_rms == 0.0:
                    self._iq_rms = rms
                else:
                    self._iq_rms = (self._iq_rms * 0.9) + (rms * 0.1)
                self._iq_peak = max(peak, self._iq_peak * 0.95)
                self._last_chunk_ts = now_ts
                self._total_samples += length
            # Fanout to channels
            channels = list(self._channels.values())
            if not channels:
                continue
            # Schedule coroutine deliveries onto the main loop so channel queues work
            futs = []
            target_loop = loop or asyncio.get_event_loop()
            for chan in channels:
                futs.append(asyncio.run_coroutine_threadsafe(chan.feed(chunk), target_loop))
            for fut in futs:
                try:
                    fut.result(timeout=1.0)
                except Exception:  # pragma: no cover - defensive
                    pass


# Singleton used by the backend
_GLOBAL_SDR_MANAGER = SdrManager()


def get_sdr_manager() -> SdrManager:
    return _GLOBAL_SDR_MANAGER


__all__ = ["SdrManager", "SdrAudioChannel", "SdrChannelSpec", "SdrUnavailableError", "get_sdr_manager"]
