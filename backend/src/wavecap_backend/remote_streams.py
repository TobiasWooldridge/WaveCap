"""Remote audio upstream helpers (pull/push) and multi-upstream selection.

This module provides minimal primitives for integrating WaveCap with external
radio/audio services (e.g., WaveCap‑SDR) and accepting server‑side push audio.

Design goals:
- Support multiple upstreams per stream with simple priority selection.
- Treat pull sources as ffmpeg-driven HTTP readers that resample to mono s16le
  at the target sample rate to match Whisper expectations.
- Allow push sources to enqueue raw PCM frames directly via an async API used by
  FastAPI request handlers.
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Dict, List, Optional, Tuple

from .models import RemoteUpstreamConfig, RemoteUpstreamState

if TYPE_CHECKING:
    from .trunked_radio import TrunkedCallChunk, TrunkedRadioClient

LOGGER = logging.getLogger(__name__)


def _sanitize_label(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    try:
        # Strip query/fragment to keep labels concise
        base = str(url).split("?", 1)[0].split("#", 1)[0]
        # Remove credentials
        if "@" in base and "://" in base:
            scheme, rest = base.split("://", 1)
            after_at = rest.split("@", 1)[1]
            return f"{scheme}://***:***@{after_at}"
        return base
    except Exception:
        return None


@dataclass
class _PullProcess:
    cfg: RemoteUpstreamConfig
    sample_rate: int
    read_size_bytes: int
    ffmpeg_rw_timeout_us: int = int(15.0 * 1e6)
    process: Optional[asyncio.subprocess.Process] = None
    queue: asyncio.Queue[bytes] = field(default_factory=lambda: asyncio.Queue(maxsize=32))
    task: Optional[asyncio.Task[None]] = None
    connected: bool = False
    last_bytes_mono: float = 0.0
    stop_event: asyncio.Event = field(default_factory=asyncio.Event)
    last_error: Optional[str] = None

    async def start(self) -> None:
        if self.task and not self.task.done():
            return
        self.stop_event.clear()
        self.task = asyncio.create_task(self._run(), name=f"remote-pull-{self.cfg.id}")

    async def stop(self) -> None:
        self.stop_event.set()
        if self.task:
            try:
                await asyncio.wait_for(self.task, timeout=5)
            except asyncio.TimeoutError:
                pass

    async def _run(self) -> None:
        import asyncio.subprocess

        next_reconnect_attempt = 0
        auth_header: Optional[str] = None
        if self.cfg.authToken:
            auth_header = f"Authorization: Bearer {self.cfg.authToken}\r\n"
        while not self.stop_event.is_set():
            if next_reconnect_attempt > 0:
                delay = min(60.0 * (2 ** (next_reconnect_attempt - 1)), 300.0)
                try:
                    await asyncio.wait_for(self.stop_event.wait(), timeout=delay)
                    break
                except asyncio.TimeoutError:
                    pass
            next_reconnect_attempt += 1
            try:
                args = [
                    "ffmpeg",
                    "-nostdin",
                    "-hide_banner",
                    "-loglevel",
                    "warning",
                    "-reconnect",
                    "1",
                    "-reconnect_streamed",
                    "1",
                    "-reconnect_at_eof",
                    "1",
                    "-rw_timeout",
                    str(self.ffmpeg_rw_timeout_us),
                    "-user_agent",
                    "WaveCap/1.0 (+https://example.invalid)",
                ]
                if auth_header:
                    args.extend(["-headers", auth_header])
                args.extend(["-i", str(self.cfg.url or ""), "-vn", "-ac", "1", "-ar", str(self.sample_rate), "-f", "s16le", "-"])
                self.process = await asyncio.create_subprocess_exec(
                    *args,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
            except Exception as exc:
                self.last_error = str(exc)
                await asyncio.sleep(min(2 ** next_reconnect_attempt, 30))
                continue

            assert self.process.stdout is not None
            self.connected = True
            next_reconnect_attempt = 0
            try:
                while not self.stop_event.is_set():
                    try:
                        chunk = await asyncio.wait_for(
                            self.process.stdout.read(self.read_size_bytes), timeout=0.5
                        )
                    except asyncio.TimeoutError:
                        continue
                    if not chunk:
                        break
                    self.last_bytes_mono = time.monotonic()
                    # Non-blocking queue with drop-oldest on overflow
                    try:
                        self.queue.put_nowait(chunk)
                    except asyncio.QueueFull:
                        try:
                            _ = self.queue.get_nowait()
                            self.queue.task_done()
                        except asyncio.QueueEmpty:
                            pass
                        try:
                            self.queue.put_nowait(chunk)
                        except asyncio.QueueFull:
                            pass
            finally:
                self.connected = False
                if self.process and self.process.returncode is None:
                    self.process.terminate()
                    try:
                        await asyncio.wait_for(self.process.wait(), timeout=5)
                    except asyncio.TimeoutError:
                        self.process.kill()
                        await self.process.wait()
                self.process = None


class MultiUpstreamSelector:
    """Coordinates multiple upstreams and exposes a single read interface.

    Selection strategy:
    - Prefer the highest-priority upstream that is currently producing data.
    - If the active upstream goes quiet, automatically fall back to the next
      available source.

    Trunked mode:
    - Trunked upstreams connect via WebSocket to WaveCap-SDR and receive
      complete calls with metadata. Use read_trunked() to get these.
    """

    def __init__(
        self,
        upstreams: List[RemoteUpstreamConfig],
        target_sample_rate: int,
        read_size_bytes: int,
    ) -> None:
        self._target_sample_rate = max(int(target_sample_rate), 1)
        self._read_size_bytes = max(int(read_size_bytes), 4096)
        self._pulls: Dict[str, _PullProcess] = {}
        self._push_queues: Dict[str, asyncio.Queue[bytes]] = {}
        self._trunked_clients: Dict[str, "TrunkedRadioClient"] = {}
        self._trunked_configs: Dict[str, RemoteUpstreamConfig] = {}
        self._states: Dict[str, RemoteUpstreamState] = {}
        self._lock = asyncio.Lock()
        # Build state and processes
        for cfg in sorted(upstreams, key=lambda u: int(getattr(u, "priority", 0)), reverse=True):
            mode = (cfg.mode or "pull").lower()
            state = RemoteUpstreamState(
                id=cfg.id,
                mode=mode,
                connected=False,
                active=False,
                sampleRate=int(cfg.sampleRate) if cfg.sampleRate else self._target_sample_rate,
                format=(cfg.format or "pcm16").lower(),
                label=_sanitize_label(cfg.url),
            )
            self._states[cfg.id] = state
            if mode == "pull":
                self._pulls[cfg.id] = _PullProcess(cfg=cfg, sample_rate=self._target_sample_rate, read_size_bytes=self._read_size_bytes)
            elif mode == "trunked":
                self._trunked_configs[cfg.id] = cfg
            else:
                self._push_queues[cfg.id] = asyncio.Queue(maxsize=64)

    async def start(self) -> None:
        for proc in self._pulls.values():
            await proc.start()
        # Start trunked clients (lazy import to avoid circular deps)
        if self._trunked_configs:
            from .trunked_radio import TrunkedRadioClient

            for cfg_id, cfg in self._trunked_configs.items():
                if cfg_id not in self._trunked_clients:
                    client = TrunkedRadioClient(
                        cfg=cfg, target_sample_rate=self._target_sample_rate
                    )
                    self._trunked_clients[cfg_id] = client
                await self._trunked_clients[cfg_id].start()

    async def stop(self) -> None:
        for proc in self._pulls.values():
            await proc.stop()
        # Stop trunked clients
        for client in self._trunked_clients.values():
            await client.stop()
        # Drain push queues and reset states
        for q in self._push_queues.values():
            while not q.empty():
                try:
                    _ = q.get_nowait()
                    q.task_done()
                except asyncio.QueueEmpty:
                    break
        for state in self._states.values():
            state.connected = False
            state.active = False

    @property
    def has_trunked_upstreams(self) -> bool:
        """Whether this selector has any trunked mode upstreams."""
        return bool(self._trunked_configs)

    async def read_trunked(
        self, timeout: float = 0.5
    ) -> Optional[Tuple[str, "TrunkedCallChunk"]]:
        """Read the next trunked call chunk from any trunked upstream.

        Returns a tuple of (source_id, chunk) or None on timeout.
        Trunked calls contain complete audio with metadata (talk group, etc.).
        """
        if not self._trunked_clients:
            await asyncio.sleep(timeout)
            return None

        # Update connection states
        for sid, client in self._trunked_clients.items():
            state = self._states.get(sid)
            if state is not None:
                state.connected = client.connected

        # Try to read from any trunked client with pending data
        for sid, client in self._trunked_clients.items():
            chunk = await client.read(timeout=timeout / max(len(self._trunked_clients), 1))
            if chunk is not None:
                # Mark active
                for s_id, st in self._states.items():
                    st.active = (s_id == sid)
                return sid, chunk

        return None

    def states(self) -> List[RemoteUpstreamState]:
        # Return a copy so callers can't mutate internal state
        return [s.model_copy() for s in self._states.values()]

    async def push_bytes(self, source_id: str, data: bytes) -> None:
        q = self._push_queues.get(source_id)
        if q is None:
            raise ValueError("Unknown push source id")
        try:
            await q.put(data)
        except asyncio.CancelledError:  # pragma: no cover - defensive
            pass

    async def read(self, timeout: float = 0.5) -> Optional[Tuple[str, bytes]]:
        """Return the next available (source_id, bytes) tuple, or None on timeout."""
        # Refresh connection flags
        now = time.monotonic()
        for sid, proc in self._pulls.items():
            state = self._states.get(sid)
            if state is None:
                continue
            state.connected = bool(proc.connected)
            if proc.connected and proc.last_bytes_mono > 0.0:
                # Consider source connected if we saw bytes recently
                state.lastBytesAt = None  # Backend stores precise timestamps elsewhere
        # Build awaitables in priority order
        queues: List[Tuple[str, asyncio.Queue[bytes]]] = []
        # Pull queues first in priority order
        for sid, proc in self._pulls.items():
            queues.append((sid, proc.queue))
        # Then push queues
        for sid, q in self._push_queues.items():
            queues.append((sid, q))
        if not queues:
            await asyncio.sleep(timeout)
            return None
        # Wait on all queues concurrently with a timeout
        tasks = [asyncio.create_task(q.get()) for _, q in queues]
        try:
            done, pending = await asyncio.wait(tasks, timeout=timeout, return_when=asyncio.FIRST_COMPLETED)
            if not done:
                return None
            # Choose the completed task whose source has the highest priority order
            winner_index = tasks.index(next(iter(done)))
            winner_sid = queues[winner_index][0]
            data = tasks[winner_index].result()
            # Mark active
            for sid, st in self._states.items():
                st.active = (sid == winner_sid)
            # Mark task done for the matched queue
            queues[winner_index][1].task_done()
            return winner_sid, data
        finally:
            for idx, t in enumerate(tasks):
                if not t.done():
                    t.cancel()

