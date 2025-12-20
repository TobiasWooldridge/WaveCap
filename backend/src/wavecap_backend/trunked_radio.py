"""Trunked radio client for WaveCap-SDR integration.

This module provides an async WebSocket client that connects to WaveCap-SDR's
multiplexed voice stream endpoint. Each WebSocket message contains a complete
call from a single talk group, encoded as JSON with base64 PCM16 audio.

Message format from WaveCap-SDR:
{
    "streamId": "recorder_0_call_12345",
    "talkgroupId": 1616,
    "talkgroupName": "Seattle PD Dispatch",
    "sourceId": 12345,
    "encrypted": false,
    "startTime": 1703000000.5,
    "durationSeconds": 5.2,
    "frequency": 774123456,
    "sourceLocation": {"latitude": 47.6, "longitude": -122.3},
    "audio": "base64_encoded_pcm16..."
}
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import time
from dataclasses import dataclass, field
from typing import Optional, Set

import numpy as np

from .models import RemoteUpstreamConfig, TrunkedRadioMetadata

LOGGER = logging.getLogger(__name__)


@dataclass
class TrunkedCallChunk:
    """A complete call from a trunked radio system.

    Each chunk represents a single transmission on a talk group, with the
    audio already decoded to float32 samples.
    """

    stream_id: str
    audio: np.ndarray  # float32 samples, mono
    metadata: TrunkedRadioMetadata
    sample_rate: int = 16000
    call_start_time: Optional[float] = None  # Unix timestamp


@dataclass
class TrunkedRadioClient:
    """Async WebSocket client for WaveCap-SDR trunked radio streams.

    Connects to a WaveCap-SDR instance and receives multiplexed voice audio
    from all active talk groups. Calls are delivered as complete chunks with
    associated metadata.
    """

    cfg: RemoteUpstreamConfig
    target_sample_rate: int = 16000

    _ws: Optional[object] = field(default=None, init=False, repr=False)
    _queue: asyncio.Queue[TrunkedCallChunk] = field(
        default_factory=lambda: asyncio.Queue(maxsize=64), init=False, repr=False
    )
    _task: Optional[asyncio.Task[None]] = field(default=None, init=False, repr=False)
    _stop_event: asyncio.Event = field(
        default_factory=asyncio.Event, init=False, repr=False
    )
    _connected: bool = field(default=False, init=False, repr=False)
    _talkgroup_filter: Set[int] = field(default_factory=set, init=False, repr=False)
    _last_error: Optional[str] = field(default=None, init=False, repr=False)

    def __post_init__(self) -> None:
        if self.cfg.talkgroupFilter:
            self._talkgroup_filter = set(self.cfg.talkgroupFilter)

    async def start(self) -> None:
        """Start the WebSocket connection task."""
        if self._task and not self._task.done():
            return
        self._stop_event.clear()
        self._task = asyncio.create_task(
            self._run(), name=f"trunked-radio-{self.cfg.id}"
        )

    async def stop(self) -> None:
        """Stop the connection and wait for cleanup."""
        self._stop_event.set()
        if self._ws is not None:
            try:
                await self._ws.close()
            except Exception:
                pass
        if self._task:
            try:
                await asyncio.wait_for(self._task, timeout=5.0)
            except asyncio.TimeoutError:
                self._task.cancel()
                try:
                    await self._task
                except asyncio.CancelledError:
                    pass
            self._task = None

    @property
    def connected(self) -> bool:
        """Whether the client is currently connected to WaveCap-SDR."""
        return self._connected

    @property
    def last_error(self) -> Optional[str]:
        """The last error message, if any."""
        return self._last_error

    async def read(self, timeout: float = 0.5) -> Optional[TrunkedCallChunk]:
        """Read the next call chunk, or None on timeout."""
        try:
            return await asyncio.wait_for(self._queue.get(), timeout=timeout)
        except asyncio.TimeoutError:
            return None

    def pending_count(self) -> int:
        """Number of chunks waiting to be read."""
        return self._queue.qsize()

    async def _run(self) -> None:
        """Main connection loop with exponential backoff reconnection."""
        try:
            import websockets
            from websockets.asyncio.client import connect
        except ImportError:
            LOGGER.error(
                "websockets package not installed; trunked radio client unavailable"
            )
            self._last_error = "websockets package not installed"
            return

        reconnect_attempt = 0

        while not self._stop_event.is_set():
            if reconnect_attempt > 0:
                delay = min(5.0 * (2 ** (reconnect_attempt - 1)), 300.0)
                LOGGER.info(
                    "Trunked client %s: reconnecting in %.1fs (attempt %d)",
                    self.cfg.id,
                    delay,
                    reconnect_attempt,
                )
                try:
                    await asyncio.wait_for(self._stop_event.wait(), timeout=delay)
                    break
                except asyncio.TimeoutError:
                    pass

            reconnect_attempt += 1
            url = self.cfg.url or ""

            try:
                headers = {}
                if self.cfg.authToken:
                    headers["Authorization"] = f"Bearer {self.cfg.authToken}"

                async with connect(url, additional_headers=headers) as ws:
                    self._ws = ws
                    self._connected = True
                    self._last_error = None
                    reconnect_attempt = 0
                    LOGGER.info(
                        "Trunked client %s: connected to %s",
                        self.cfg.id,
                        url,
                    )

                    async for message in ws:
                        if self._stop_event.is_set():
                            break
                        await self._process_message(message)

            except asyncio.CancelledError:
                break
            except Exception as exc:
                self._last_error = str(exc)
                LOGGER.warning(
                    "Trunked client %s connection error: %s",
                    self.cfg.id,
                    exc,
                )
            finally:
                self._connected = False
                self._ws = None

    async def _process_message(self, raw: str | bytes) -> None:
        """Parse a WaveCap-SDR voice message and queue the audio."""
        try:
            if isinstance(raw, bytes):
                data = json.loads(raw.decode("utf-8"))
            else:
                data = json.loads(raw)

            talkgroup_id = data.get("talkgroupId")
            if talkgroup_id is None:
                return

            talkgroup_id = int(talkgroup_id)

            # Apply talk group filter if configured
            if self._talkgroup_filter and talkgroup_id not in self._talkgroup_filter:
                return

            # Decode base64 PCM16 audio
            audio_b64 = data.get("audio", "")
            if not audio_b64:
                return

            pcm_bytes = base64.b64decode(audio_b64)
            samples = np.frombuffer(pcm_bytes, dtype=np.int16)
            audio = samples.astype(np.float32) / 32768.0

            # Extract frequency (convert Hz to MHz if present)
            frequency_hz = data.get("frequency") or data.get("frequencyHz")
            frequency_mhz = None
            if frequency_hz is not None:
                try:
                    frequency_mhz = float(frequency_hz) / 1_000_000.0
                except (TypeError, ValueError):
                    pass

            # Build metadata
            metadata = TrunkedRadioMetadata(
                talkgroupId=str(talkgroup_id),
                talkgroupName=data.get("talkgroupName"),
                sourceUnitId=str(data["sourceId"]) if data.get("sourceId") else None,
                frequencyMhz=frequency_mhz,
                encrypted=bool(data.get("encrypted", False)),
                callDurationSeconds=data.get("durationSeconds"),
            )

            # Extract GPS if present
            location = data.get("sourceLocation")
            if location and isinstance(location, dict):
                lat = location.get("latitude")
                lon = location.get("longitude")
                if lat is not None and lon is not None:
                    try:
                        metadata.gpsLatitude = float(lat)
                        metadata.gpsLongitude = float(lon)
                    except (TypeError, ValueError):
                        pass

            chunk = TrunkedCallChunk(
                stream_id=data.get("streamId", f"call_{time.time()}"),
                audio=audio,
                metadata=metadata,
                sample_rate=self.target_sample_rate,
                call_start_time=data.get("startTime"),
            )

            # Non-blocking enqueue with overflow handling
            try:
                self._queue.put_nowait(chunk)
            except asyncio.QueueFull:
                # Drop oldest to make room
                try:
                    self._queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
                try:
                    self._queue.put_nowait(chunk)
                except asyncio.QueueFull:
                    LOGGER.warning(
                        "Trunked client %s: dropping call due to queue overflow",
                        self.cfg.id,
                    )

        except Exception as exc:
            LOGGER.warning(
                "Trunked client %s: failed to parse message: %s",
                self.cfg.id,
                exc,
            )
