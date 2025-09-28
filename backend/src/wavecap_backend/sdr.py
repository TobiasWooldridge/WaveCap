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
from dataclasses import dataclass
from typing import Dict, Optional, Tuple

import numpy as np

try:  # Optional dependency; graceful runtime fallback
    import SoapySDR  # type: ignore
    from SoapySDR import SOAPY_SDR_CF32, SOAPY_SDR_RX  # type: ignore
except Exception:  # pragma: no cover - runtime environment dependent
    SoapySDR = None  # type: ignore
    SOAPY_SDR_CF32 = None  # type: ignore
    SOAPY_SDR_RX = None  # type: ignore

LOGGER = logging.getLogger(__name__)


# Public API -----------------------------------------------------------------


@dataclass(frozen=True)
class SdrChannelSpec:
    stream_id: str
    device_id: str
    frequency_hz: int
    mode: str = "nfm"
    bandwidth_hz: Optional[int] = None


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


class SdrManager:
    """Coordinates SDR device workers and channel registration."""

    def __init__(self) -> None:
        self._devices: Dict[str, _DeviceWorker] = {}
        self._device_configs: Dict[str, Tuple[str, int, Optional[float]]] = {}
        self._stream_specs: Dict[str, SdrChannelSpec] = {}
        self._lock = asyncio.Lock()

    def configure_device(self, device_id: str, soapy_args: str, sample_rate_hz: int, gain_db: Optional[float]) -> None:
        self._device_configs[device_id] = (soapy_args, int(sample_rate_hz), gain_db)

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
                soapy_args, sample_rate_hz, gain_db = config
                worker = _DeviceWorker(
                    device_id=spec.device_id,
                    soapy_args=soapy_args,
                    sample_rate_hz=sample_rate_hz,
                    gain_db=gain_db,
                    audio_sample_rate=audio_sample_rate,
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


# Implementation --------------------------------------------------------------


class _FMDemodDecimator:
    """Stateful FM demodulator + lowpass + integer decimator to audio rate."""

    def __init__(self, input_rate: int, audio_rate: int) -> None:
        if input_rate % audio_rate != 0:
            raise ValueError("input_rate must be an integer multiple of audio_rate")
        self._input_rate = int(input_rate)
        self._audio_rate = int(audio_rate)
        self._decim = self._input_rate // self._audio_rate
        # Simple lowpass FIR for ~4 kHz passband at input rate
        cutoff_hz = 4000.0
        nyq = 0.5 * self._input_rate
        norm = cutoff_hz / nyq
        taps = 127  # keep small for CPU
        n = np.arange(taps) - (taps - 1) / 2.0
        # Avoid division by zero at center tap
        h = np.sinc(norm * n)
        window = 0.54 - 0.46 * np.cos(2 * np.pi * (np.arange(taps) / (taps - 1)))
        self._fir = (h * window).astype(np.float32)
        self._fir /= np.sum(self._fir)
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


class _ChannelDemod:
    def __init__(self, stream_id: str, input_rate: int, audio_rate: int, abs_frequency_hz: float, center_frequency_hz: float) -> None:
        self.stream_id = stream_id
        self._input_rate = float(input_rate)
        self._audio_rate = int(audio_rate)
        self._abs_freq = float(abs_frequency_hz)
        self._freq_offset = float(abs_frequency_hz - center_frequency_hz)
        self._phase = 0.0
        self._twopi = 2.0 * math.pi
        self._queue: "asyncio.Queue[bytes]" = asyncio.Queue(maxsize=32)
        self._demod = _FMDemodDecimator(int(input_rate), int(audio_rate))

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
        # Keep phase continuous across chunks
        self._phase = float((phase[-1] + phase_inc) % self._twopi)
        return mixed

    async def feed(self, iq: np.ndarray) -> None:
        audio = self._demod.process(self._mix_down(iq))
        if audio.size == 0:
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


class _DeviceWorker:
    def __init__(
        self,
        *,
        device_id: str,
        soapy_args: str,
        sample_rate_hz: int,
        gain_db: Optional[float],
        audio_sample_rate: int,
    ) -> None:
        self.device_id = device_id
        self.soapy_args = soapy_args
        self.sample_rate_hz = int(sample_rate_hz)
        self.audio_sample_rate = int(audio_sample_rate)
        self.gain_db = gain_db
        self._dev = None
        self._stream = None
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._stop = threading.Event()
        self._channels: Dict[str, _ChannelDemod] = {}
        self._center_hz: Optional[float] = None
        self._lock = asyncio.Lock()

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
                self._tune(float(spec.frequency_hz))
            else:
                self._recompute_center_frequency(add_freq=float(spec.frequency_hz))
            center = float(self._center_hz or spec.frequency_hz)
            chan = _ChannelDemod(
                spec.stream_id,
                self.sample_rate_hz,
                self.audio_sample_rate,
                float(spec.frequency_hz),
                center,
            )
            self._channels[spec.stream_id] = chan
        return chan.queue()

    async def remove_channel(self, stream_id: str) -> None:
        async with self._lock:
            self._channels.pop(stream_id, None)
            self._recompute_center_frequency()

    # Internal ----------------------------------------------------------------

    def _init_device(self) -> None:
        assert SoapySDR is not None  # noqa: S101
        self._dev = SoapySDR.Device(self.soapy_args)
        self._dev.setSampleRate(SOAPY_SDR_RX, 0, self.sample_rate_hz)
        if self.gain_db is not None:
            try:
                self._dev.setGain(SOAPY_SDR_RX, 0, float(self.gain_db))
            except Exception:  # pragma: no cover - device specific
                LOGGER.warning("Setting SDR gain unsupported; continuing")
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

    def _tune(self, center_hz: float) -> None:
        if not self._dev:
            return
        if self._center_hz is None or abs(center_hz - self._center_hz) > 1.0:
            try:
                self._dev.setFrequency(SOAPY_SDR_RX, 0, float(center_hz))
                self._center_hz = float(center_hz)
                LOGGER.info("SDR %s tuned to %.0f Hz", self.device_id, center_hz)
            except Exception as exc:  # pragma: no cover - hardware dependent
                LOGGER.error("Failed to tune SDR %s: %s", self.device_id, exc)

    def _recompute_center_frequency(self, add_freq: Optional[float] = None) -> None:
        if add_freq is None and not self._channels:
            return
        freqs = []
        if add_freq is not None:
            freqs.append(float(add_freq))
        for chan in self._channels.values():
            # Use absolute channel frequency tracked by the demod
            freqs.append(float(chan._abs_freq))  # noqa: SLF001 - internal
        if not freqs:
            return
        new_center = float(sum(freqs) / len(freqs))
        span = float(max(freqs) - min(freqs))
        # Ensure configured sample rate covers span with margin
        if span > (self.sample_rate_hz * 0.8):
            LOGGER.warning(
                "Configured sample rate %d Hz may be too low for %.0f Hz span; channels may clip",
                self.sample_rate_hz,
                span,
            )
        self._tune(new_center)
        # Update offsets
        for chan in self._channels.values():
            chan.update_offset(float(chan._abs_freq) - new_center)  # noqa: SLF001

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
