"""High level stream management orchestration."""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import AsyncIterator, Callable, Dict, List, Optional

from pydantic_core import to_jsonable_python

from .alerts import TranscriptionAlertEvaluator
from .datetime_utils import utcnow
from .database import StreamDatabase
from .models import (
    AlertsConfig,
    AppConfig,
    ExportTranscriptionsRequest,
    PagerWebhookRequest,
    RemoteUpstreamConfig,
    Stream,
    StreamConfig,
    StreamSource,
    StreamStatus,
    TranscriptionEventType,
    TranscriptionQueryResponse,
    TranscriptionResult,
    TranscriptionReviewStatus,
    UpdateStreamRequest,
)
from .state_paths import RECORDINGS_DIR
from .stream_worker import StreamWorker
from .transcription_executor import TranscriptionExecutor
from .whisper_transcriber import AbstractTranscriber
from .llm_corrector import AbstractLLMCorrector, create_corrector
from .stream_defaults import (
    DEFAULT_RECORDING_RETENTION_SECONDS,
    resolve_ignore_first_seconds,
    resolve_recording_retention_seconds,
)

LOGGER = logging.getLogger(__name__)

RECORDING_STARTED_MESSAGE = "Recording and transcription started"
RECORDING_STOPPED_MESSAGE = "Recording and transcription stopped"
UPSTREAM_DISCONNECTED_MESSAGE = "Lost connection to upstream stream"
UPSTREAM_RECONNECTED_MESSAGE = "Reconnected to upstream stream"
RETENTION_SWEEP_INTERVAL_SECONDS = 5 * 60

# Auto-restart configuration for streams that enter ERROR state
AUTO_RESTART_DELAY_SECONDS = 30.0  # Initial delay before restart attempt
AUTO_RESTART_MAX_DELAY_SECONDS = 300.0  # Cap exponential backoff at 5 minutes
AUTO_RESTART_MAX_ATTEMPTS = 5  # Maximum restart attempts before giving up

# Shutdown configuration
WORKER_STOP_TIMEOUT_SECONDS = 10.0  # Max time to wait for each worker to stop


class SystemEventTriggerType(str, Enum):
    """Enumerates reasons that can trigger system logging events."""

    USER_REQUEST = "user_request"
    AUTOMATIC_RESUME = "automatic_resume_after_restart"
    AUTOMATIC_SYNCHRONIZATION = "automatic_synchronization"
    AUTOMATIC_RESTART_AFTER_ERROR = "automatic_restart_after_error"
    SERVICE_SHUTDOWN = "service_shutdown"
    SOURCE_STREAM_ENDED = "source_stream_ended"
    STREAM_ERROR = "stream_error"
    SYSTEM_ACTIVITY = "system_activity"
    UNSPECIFIED = "unspecified"


@dataclass(frozen=True)
class SystemEventTrigger:
    """Strongly typed description of why a system event was recorded."""

    type: SystemEventTriggerType
    detail: Optional[str] = None

    def __post_init__(self) -> None:
        object.__setattr__(self, "detail", self._normalize_detail(self.detail))

    @staticmethod
    def _normalize_detail(value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        condensed = " ".join(value.split())
        return condensed or None

    def describe(self) -> str:
        detail = self.detail
        if self.type == SystemEventTriggerType.USER_REQUEST:
            return "user request"
        if self.type == SystemEventTriggerType.AUTOMATIC_RESUME:
            return "automatic resume after restart"
        if self.type == SystemEventTriggerType.AUTOMATIC_SYNCHRONIZATION:
            return "automatic synchronization"
        if self.type == SystemEventTriggerType.SERVICE_SHUTDOWN:
            return "service shutdown"
        if self.type == SystemEventTriggerType.SOURCE_STREAM_ENDED:
            return "source stream ended"
        if self.type == SystemEventTriggerType.STREAM_ERROR:
            if detail:
                return f"stream error: {detail}"
            return "stream error"
        if self.type == SystemEventTriggerType.SYSTEM_ACTIVITY:
            if detail:
                return detail
            return "an unspecified system activity"
        if detail:
            if detail.lower().startswith("triggered"):
                return detail
            return detail
        return "an unspecified reason"

    @classmethod
    def user_request(cls) -> "SystemEventTrigger":
        return cls(SystemEventTriggerType.USER_REQUEST)

    @classmethod
    def automatic_resume(cls) -> "SystemEventTrigger":
        return cls(SystemEventTriggerType.AUTOMATIC_RESUME)

    @classmethod
    def automatic_synchronization(cls) -> "SystemEventTrigger":
        return cls(SystemEventTriggerType.AUTOMATIC_SYNCHRONIZATION)

    @classmethod
    def automatic_restart_after_error(cls, attempt: int) -> "SystemEventTrigger":
        return cls(
            SystemEventTriggerType.AUTOMATIC_RESTART_AFTER_ERROR,
            detail=f"attempt {attempt}",
        )

    @classmethod
    def service_shutdown(cls) -> "SystemEventTrigger":
        return cls(SystemEventTriggerType.SERVICE_SHUTDOWN)

    @classmethod
    def source_stream_ended(cls) -> "SystemEventTrigger":
        return cls(SystemEventTriggerType.SOURCE_STREAM_ENDED)

    @classmethod
    def stream_error(cls, detail: Optional[str]) -> "SystemEventTrigger":
        return cls(SystemEventTriggerType.STREAM_ERROR, detail)

    @classmethod
    def system_activity(
        cls, detail: Optional[str] = None
    ) -> "SystemEventTrigger":
        return cls(SystemEventTriggerType.SYSTEM_ACTIVITY, detail)

    @classmethod
    def manual(cls, reason: Optional[str]) -> "SystemEventTrigger":
        return cls(SystemEventTriggerType.UNSPECIFIED, reason)


def _format_trigger_suffix(trigger: Optional[SystemEventTrigger]) -> str:
    """Return the human readable text that describes why a system event fired."""

    resolved = trigger or SystemEventTrigger.manual(None)
    description = resolved.describe()
    if description.lower().startswith("triggered"):
        return description
    return f"triggered by {description}"


def _format_retry_phrase(delay_seconds: float) -> str:
    if delay_seconds <= 0.5:
        return "retrying immediately"
    if delay_seconds < 60:
        seconds = max(int(round(delay_seconds)), 1)
        unit = "second" if seconds == 1 else "seconds"
        return f"retrying in {seconds} {unit}"
    minutes = delay_seconds / 60
    rounded = round(minutes, 1)
    if abs(rounded - round(minutes)) < 1e-6:
        minutes_value = max(int(round(minutes)), 1)
        unit = "minute" if minutes_value == 1 else "minutes"
        return f"retrying in {minutes_value} {unit}"
    unit = "minutes"
    return f"retrying in {rounded:.1f} {unit}"

class StreamEvent:
    def __init__(self, event_type: str, payload: dict):
        self.type = event_type
        self.payload = payload


class StreamEventBroadcaster:
    """Simple pub/sub helper for websocket updates."""

    def __init__(self, max_queue_size: int = 256) -> None:
        self._subscribers: List[asyncio.Queue[StreamEvent]] = []
        self._lock = asyncio.Lock()
        self._max_queue_size = max_queue_size

    async def publish(self, event: StreamEvent) -> None:
        async with self._lock:
            subscribers = list(self._subscribers)

        for queue in subscribers:
            self._enqueue_event(queue, event)

    def _enqueue_event(
        self, queue: asyncio.Queue[StreamEvent], event: StreamEvent
    ) -> None:
        try:
            queue.put_nowait(event)
            return
        except asyncio.QueueFull:
            try:
                queue.get_nowait()
            except asyncio.QueueEmpty:
                LOGGER.debug("WebSocket queue overflow resolved without drop")
            else:
                LOGGER.warning("Dropping oldest websocket event for slow subscriber")
        try:
            queue.put_nowait(event)
        except asyncio.QueueFull:
            LOGGER.warning(
                "Failed to enqueue websocket event after dropping oldest entry"
            )

    async def register(self) -> asyncio.Queue[StreamEvent]:
        queue: asyncio.Queue[StreamEvent] = asyncio.Queue(self._max_queue_size)
        async with self._lock:
            self._subscribers.append(queue)
        return queue

    async def unregister(self, queue: asyncio.Queue[StreamEvent]) -> None:
        async with self._lock:
            if queue in self._subscribers:
                self._subscribers.remove(queue)


class StreamManager:
    """Coordinates all stream lifecycle operations."""

    def __init__(
        self,
        config: AppConfig,
        database: StreamDatabase,
        transcriber: AbstractTranscriber,
        worker_factory: Optional[Callable[..., StreamWorker]] = None,
        transcription_executor: Optional[TranscriptionExecutor] = None,
    ) -> None:
        self.config = config
        self.database = database
        self.transcriber = transcriber
        self.alert_evaluator = TranscriptionAlertEvaluator(config.alerts)
        self.streams: Dict[str, Stream] = {}
        self.workers: Dict[str, StreamWorker] = {}
        self.broadcaster = StreamEventBroadcaster()
        self._lock = asyncio.Lock()
        self._worker_factory = worker_factory
        concurrency = self._resolve_concurrency(config.whisper.maxConcurrentProcesses)
        queue_size = max(concurrency * 4, 8)
        self._executor = transcription_executor or TranscriptionExecutor(
            worker_count=concurrency, queue_size=queue_size
        )
        self._owns_executor = transcription_executor is None
        self._llm_corrector: AbstractLLMCorrector = create_corrector(config.llm)
        self._start_triggers: Dict[str, SystemEventTrigger] = {}
        self._stop_triggers: Dict[str, SystemEventTrigger] = {}
        self._last_event_timestamps: Dict[str, datetime] = {}
        self._event_locks: Dict[str, asyncio.Lock] = {}
        self._last_streams_signature: Optional[str] = None
        self._retention_task: Optional[asyncio.Task[None]] = None
        self._retention_stop: Optional[asyncio.Event] = None
        # Auto-restart tracking for streams that fail with errors
        self._restart_attempts: Dict[str, int] = {}
        self._restart_tasks: Dict[str, asyncio.Task[None]] = {}
        self._shutting_down = False

    @staticmethod
    def _resolve_concurrency(value: Optional[int]) -> int:
        try:
            parsed = int(value) if value is not None else 0
        except (TypeError, ValueError):
            parsed = 0
        if parsed <= 0:
            return 1
        return parsed

    async def _save_stream(self, stream: Stream) -> None:
        await self.database.save_stream(stream)

    async def _delete_stream(self, stream_id: str) -> None:
        await self.database.delete_stream(stream_id)

    async def _append_transcription(self, transcription: TranscriptionResult) -> None:
        await self.database.append_transcription(transcription)

    async def _update_stream_activity(
        self, stream_id: str, timestamp: datetime
    ) -> None:
        await self.database.update_stream_activity(stream_id, timestamp)

    async def _load_recent_transcriptions(
        self, stream_id: str, limit: int
    ) -> List[TranscriptionResult]:
        return await self.database.load_recent_transcriptions(stream_id, limit)

    def _create_worker(self, stream: Stream) -> StreamWorker:
        factory = self._worker_factory or StreamWorker
        # Resolve per-stream initial prompt
        prompt_override: Optional[str] = None
        try:
            stream_cfg = next((s for s in self.config.streams if s.id == stream.id), None)
        except Exception:
            stream_cfg = None
        if stream_cfg and getattr(stream_cfg, "initialPromptName", None):
            name = (stream_cfg.initialPromptName or "").strip()
            if name:
                prompt_override = self.config.whisper.prompts.get(name)
                if prompt_override is None:
                    LOGGER.warning(
                        "Unknown initialPromptName '%s' for stream %s; falling back to global initialPrompt",
                        name,
                        stream.id,
                    )
        if prompt_override is None:
            prompt_override = self.config.whisper.initialPrompt
        # Attach remote upstream definitions when applicable
        remote_upstreams: Optional[list[RemoteUpstreamConfig]] = None
        if stream_cfg and stream_cfg.source == StreamSource.REMOTE:
            ups = list(stream_cfg.remoteUpstreams or [])
            remote_upstreams = ups if ups else None

        return factory(
            stream=stream,
            transcriber=self.transcriber,
            transcription_executor=self._executor,
            database=self.database,
            alert_evaluator=self.alert_evaluator,
            on_transcription=self._handle_transcription,
            on_status_change=self._handle_status_change,
            on_upstream_disconnect=self._handle_upstream_disconnect,
            on_upstream_reconnect=self._handle_upstream_reconnect,
            config=self.config.whisper,
            initial_prompt=prompt_override,
            remote_upstreams=remote_upstreams,
            llm_corrector=self._llm_corrector,
        )

    @staticmethod
    def _resolve_stream_retention_from_config(
        stream_config: StreamConfig,
    ) -> Optional[float]:
        if stream_config.source == StreamSource.PAGER:
            return None
        return resolve_recording_retention_seconds(
            stream_config.recordingRetentionSeconds
        )

    async def _ensure_stream_alignment(
        self, stream_id: str, trigger: SystemEventTrigger
    ) -> None:
        worker_to_start: Optional[StreamWorker] = None
        worker_to_stop: Optional[StreamWorker] = None
        should_broadcast = False
        async with self._lock:
            stream = self.streams.get(stream_id)
            if not stream:
                return
            if stream.source == StreamSource.PAGER:
                # Pager streams only run when enabled in config; do not persist state.
                if stream.enabled and stream.status != StreamStatus.TRANSCRIBING:
                    stream.status = StreamStatus.TRANSCRIBING
                    should_broadcast = True
                elif not stream.enabled and stream.status != StreamStatus.STOPPED:
                    stream.status = StreamStatus.STOPPED
                    stream.error = None
                    should_broadcast = True
                return

            if stream.enabled:
                if stream_id not in self.workers:
                    worker_to_start = self._create_worker(stream)
                    self.workers[stream_id] = worker_to_start
                    self._start_triggers[stream_id] = trigger
                    stream.status = StreamStatus.QUEUED
                    stream.error = None
                    should_broadcast = True
                elif stream.status == StreamStatus.STOPPED:
                    stream.status = StreamStatus.QUEUED
                    should_broadcast = True
            else:
                worker = self.workers.pop(stream_id, None)
                if worker:
                    self._stop_triggers[stream_id] = trigger
                    worker_to_stop = worker
                if stream.status != StreamStatus.STOPPED or stream.error:
                    stream.status = StreamStatus.STOPPED
                    stream.error = None
                    should_broadcast = True
            # No persistence of transient status/enabled changes

        if worker_to_start:
            worker_to_start.start()
        if worker_to_stop:
            await worker_to_stop.stop()
        if should_broadcast or worker_to_start or worker_to_stop:
            await self._broadcast_streams()

    def _build_stream_from_config(
        self, stream_config: StreamConfig, existing: Optional[Stream]
    ) -> Stream:
        pinned = bool(stream_config.pinned)
        retention_seconds = self._resolve_stream_retention_from_config(stream_config)
        if stream_config.source == StreamSource.PAGER:
            url = (stream_config.url or f"/api/pager-feeds/{stream_config.id}").strip()
            enabled = bool(stream_config.enabled)
            status = StreamStatus.TRANSCRIBING if enabled else StreamStatus.STOPPED
            base = existing or Stream(
                id=stream_config.id,
                name=stream_config.name,
                url=url,
                status=status,
                enabled=enabled,
                pinned=pinned,
                createdAt=utcnow(),
                language=None,
                transcriptions=[],
                source=StreamSource.PAGER,
                webhookToken=stream_config.webhookToken,
                ignoreFirstSeconds=0.0,
                recordingRetentionSeconds=retention_seconds,
                baseLocation=stream_config.baseLocation,
            )
            return base.model_copy(
                update={
                    "name": stream_config.name,
                    "url": url,
                    "source": StreamSource.PAGER,
                    "webhookToken": stream_config.webhookToken,
                    "ignoreFirstSeconds": 0.0,
                    "recordingRetentionSeconds": retention_seconds,
                    "language": None,
                    "enabled": enabled,
                    "pinned": pinned,
                    "status": status,
                    "error": None,
                    "baseLocation": stream_config.baseLocation,
                }
            )

        url = (stream_config.url or "").strip()
        language = stream_config.language.strip() if stream_config.language else None
        ignore_seconds = resolve_ignore_first_seconds(
            StreamSource.AUDIO, url, stream_config.ignoreFirstSeconds
        )
        if existing is None:
            enabled = bool(stream_config.enabled)
            status = StreamStatus.STOPPED
            return Stream(
                id=stream_config.id,
                name=stream_config.name,
                url=url,
                status=status,
                enabled=enabled,
                pinned=pinned,
                createdAt=utcnow(),
                language=language,
                transcriptions=[],
                source=StreamSource.AUDIO,
                webhookToken=None,
                ignoreFirstSeconds=ignore_seconds,
                recordingRetentionSeconds=retention_seconds,
                baseLocation=stream_config.baseLocation,
            )
        updates = {
            "name": stream_config.name,
            "url": url,
            "language": language,
            "source": StreamSource.AUDIO,
            "ignoreFirstSeconds": ignore_seconds,
            "webhookToken": None,
            "pinned": pinned,
            # Ensure enabled state reflects configuration even when a DB record exists
            "enabled": bool(stream_config.enabled),
            "baseLocation": stream_config.baseLocation,
            "recordingRetentionSeconds": retention_seconds,
        }
        return existing.model_copy(update=updates)

    def _build_remote_stream_from_config(self, stream_config: StreamConfig, existing: Optional[Stream]) -> Stream:
        url = (stream_config.url or f"remote://{stream_config.id}").strip()
        pinned = bool(stream_config.pinned)
        language = (stream_config.language or "").strip() or None
        ignore_seconds = resolve_ignore_first_seconds(StreamSource.REMOTE, url, stream_config.ignoreFirstSeconds)
        retention_seconds = self._resolve_stream_retention_from_config(stream_config)
        base = existing or Stream(
            id=stream_config.id,
            name=stream_config.name,
            url=url,
            status=StreamStatus.STOPPED,
            enabled=bool(stream_config.enabled),
            pinned=pinned,
            createdAt=utcnow(),
            language=language,
            transcriptions=[],
            source=StreamSource.REMOTE,
            webhookToken=None,
            ignoreFirstSeconds=ignore_seconds,
            recordingRetentionSeconds=retention_seconds,
            baseLocation=stream_config.baseLocation,
        )
        updates = {
            "name": stream_config.name,
            "url": url,
            "language": language,
            "source": StreamSource.REMOTE,
            "ignoreFirstSeconds": ignore_seconds,
            "webhookToken": None,
            "pinned": pinned,
            "enabled": bool(stream_config.enabled),
            "baseLocation": stream_config.baseLocation,
            "recordingRetentionSeconds": retention_seconds,
            # upstreams metadata populated at runtime
        }
        return base.model_copy(update=updates)

    async def initialize(self) -> None:
        await self._executor.start()
        persisted_streams = {
            stream.id: stream for stream in await self.database.load_streams()
        }
        configured_ids = {stream.id for stream in self.config.streams}

        for stream_id in list(persisted_streams.keys()):
            if stream_id not in configured_ids:
                LOGGER.info(
                    "Removing persisted stream %s not present in configuration",
                    stream_id,
                )
                await self._delete_stream(stream_id)
                self._delete_recordings(stream_id)
                persisted_streams.pop(stream_id, None)

        streams: List[Stream] = []
        for stream_config in self.config.streams:
            existing = persisted_streams.get(stream_config.id)
            if existing and existing.source != stream_config.source:
                LOGGER.info(
                    "Recreating stream %s after source change (%s → %s)",
                    stream_config.id,
                    existing.source,
                    stream_config.source,
                )
                await self._delete_stream(existing.id)
                self._delete_recordings(existing.id)
                existing = None
            if stream_config.source == StreamSource.PAGER:
                stream = self._build_stream_from_config(stream_config, existing)
            elif stream_config.source == StreamSource.REMOTE:
                stream = self._build_remote_stream_from_config(stream_config, existing)
            else:
                stream = self._build_stream_from_config(stream_config, existing)
            await self._save_stream(stream)
            streams.append(stream)
        streams_to_activate: List[Stream] = []
        for stream in streams:
            await self._apply_default_preroll(stream)
            if (stream.source in (StreamSource.AUDIO, StreamSource.REMOTE)):
                if stream.enabled:
                    if stream.error:
                        # Clear ephemeral errors but do not persist to DB
                        stream.error = None
                    streams_to_activate.append(stream)
                elif stream.status != StreamStatus.STOPPED:
                    stream.status = StreamStatus.STOPPED
            transcriptions = await self._load_recent_transcriptions(stream.id, limit=100)
            stream.transcriptions = transcriptions
            if transcriptions:
                latest_timestamp = transcriptions[0].timestamp
                if (
                    stream.lastActivityAt is None
                    or stream.lastActivityAt < latest_timestamp
                ):
                    stream.lastActivityAt = latest_timestamp
                    await self._update_stream_activity(stream.id, latest_timestamp)
                self._last_event_timestamps[stream.id] = latest_timestamp
            elif stream.lastActivityAt:
                self._last_event_timestamps[stream.id] = stream.lastActivityAt
            self.streams[stream.id] = stream
        await self._broadcast_streams(include_transcriptions=True)
        if streams_to_activate:
            LOGGER.info("Synchronizing %d stream(s) with enabled state", len(streams_to_activate))
            resumed_streams: List[Stream] = []
            for stream in streams_to_activate:
                try:
                    await self._ensure_stream_alignment(
                        stream.id,
                        trigger=SystemEventTrigger.automatic_resume(),
                    )
                except Exception:  # pragma: no cover - defensive startup
                    LOGGER.exception(
                        "Failed to restart stream %s during initialization", stream.id
                    )
                else:
                    resumed_streams.append(stream)
            # Note: RECORDING_STARTED events are emitted by _handle_status_change()
            # when the worker transitions to TRANSCRIBING status. We no longer
            # emit them explicitly here to avoid duplicates.
        await self._prune_expired_recordings()
        self._start_retention_task()

    def get_streams(self) -> List[Stream]:
        results: List[Stream] = []
        for s in self.streams.values():
            copy = s.model_copy()
            if copy.source == StreamSource.REMOTE:
                worker = self.workers.get(copy.id)
                if worker is not None:
                    try:
                        states = worker.get_remote_upstream_states()
                    except Exception:
                        LOGGER.warning(
                            "Failed to get remote upstream states for stream %s",
                            copy.id,
                            exc_info=True,
                        )
                        states = []
                    copy.upstreams = states or None
                else:
                    copy.upstreams = None
            results.append(copy)
        return results

    async def update_stream(
        self, stream_id: str, request: UpdateStreamRequest
    ) -> Stream:
        should_broadcast = False
        async with self._lock:
            stream = self.streams.get(stream_id)
            if not stream:
                raise ValueError("Stream not found")

            changed = False

            if request.name is not None:
                normalized_name = request.name.strip()
                next_name = normalized_name or (stream.url or f"Stream {stream.id}")
                if next_name != stream.name:
                    stream.name = next_name
                    changed = True

            if request.language is not None:
                normalized_language = request.language.strip() if request.language else ""
                if stream.source == StreamSource.PAGER and normalized_language:
                    raise ValueError("Language cannot be set for pager streams")
                next_language = normalized_language or None
                if stream.language != next_language:
                    stream.language = next_language
                    changed = True

            if request.ignoreFirstSeconds is not None:
                resolved_seconds = resolve_ignore_first_seconds(
                    stream.source, stream.url, request.ignoreFirstSeconds
                )
                if stream.ignoreFirstSeconds != resolved_seconds:
                    stream.ignoreFirstSeconds = resolved_seconds
                    changed = True

            if changed:
                await self._save_stream(stream)
                should_broadcast = True

            updated_stream = stream

        if should_broadcast:
            await self._broadcast_streams()

        return updated_stream

    async def start_stream(
        self,
        stream_id: str,
        trigger: Optional[SystemEventTrigger] = None,
    ) -> None:
        trigger = trigger or SystemEventTrigger.user_request()
        async with self._lock:
            stream = self.streams.get(stream_id)
            if stream is None:
                raise ValueError(f"Stream {stream_id} not found")
            if stream.source == StreamSource.PAGER:
                raise ValueError("Pager streams start automatically when enabled in configuration")
            if stream.enabled:
                # Already enabled; ensure worker alignment without mutating persistence twice.
                pass
            else:
                stream.enabled = True
                stream.error = None
                await self._save_stream(stream)
                for cfg in self.config.streams:
                    if cfg.id == stream_id:
                        cfg.enabled = True
                        break
        await self._ensure_stream_alignment(stream_id, trigger)

    async def stop_stream(
        self,
        stream_id: str,
        trigger: Optional[SystemEventTrigger] = None,
    ) -> None:
        trigger = trigger or SystemEventTrigger.user_request()
        async with self._lock:
            stream = self.streams.get(stream_id)
            if stream is None:
                raise ValueError(f"Stream {stream_id} not found")
            if stream.source == StreamSource.PAGER:
                raise ValueError("Pager streams stop automatically when disabled in configuration")
            if stream.enabled:
                stream.enabled = False
                await self._save_stream(stream)
                for cfg in self.config.streams:
                    if cfg.id == stream_id:
                        cfg.enabled = False
                        break
        await self._ensure_stream_alignment(stream_id, trigger)

    async def reset_stream(self, stream_id: str) -> None:
        # Stop worker if running, but do not change enabled state or persist transient status
        worker: Optional[StreamWorker] = None
        async with self._lock:
            worker = self.workers.pop(stream_id, None)
            stream = self.streams.get(stream_id)
            if not stream:
                return
            stream.transcriptions.clear()
            await self._delete_stream(stream_id)
            self._last_event_timestamps.pop(stream_id, None)
            # Reset createdAt to now to match semantics of clearing history
            stream.createdAt = utcnow()
            # Keep status aligned with type but do not persist
            stream.status = (
                StreamStatus.TRANSCRIBING
                if (stream.source == StreamSource.PAGER and stream.enabled)
                else StreamStatus.STOPPED
            )
            stream.error = None
            await self._save_stream(stream)
        if worker:
            await worker.stop()
        self._delete_recordings(stream_id)
        await self._broadcast_streams(include_transcriptions=True)

    async def update_alerts(self, config: AlertsConfig) -> None:
        self.config.alerts = config
        self.alert_evaluator.update_config(config)

    async def query_transcriptions(
        self,
        stream_id: str,
        limit: int = 100,
        before: Optional[datetime] = None,
        after: Optional[datetime] = None,
        search: Optional[str] = None,
        order: str = "desc",
    ) -> TranscriptionQueryResponse:
        transcriptions, has_more = await self.database.query_transcriptions(
            stream_id,
            limit,
            before,
            after,
            search,
            order,
        )
        order_normalized = order.lower()
        return TranscriptionQueryResponse(
            transcriptions=transcriptions,
            hasMoreAfter=has_more if order_normalized == "asc" else False,
            hasMoreBefore=has_more if order_normalized != "asc" else False,
        )

    def iter_live_audio(self, stream_id: str) -> AsyncIterator[bytes]:
        worker = self.workers.get(stream_id)
        if worker is None:
            raise ValueError("Stream is not actively transcribing")
        return worker.iter_live_audio()

    async def update_review(
        self,
        transcription_id: str,
        corrected_text: Optional[str],
        status: TranscriptionReviewStatus,
        reviewer: Optional[str],
    ) -> TranscriptionResult:
        result = await self.database.update_review(
            transcription_id,
            corrected_text,
            status,
            reviewer,
        )
        await self.broadcaster.publish(
            StreamEvent("transcription", result.model_dump(by_alias=True))
        )
        return result

    async def export_transcriptions(
        self, request: ExportTranscriptionsRequest
    ) -> List[TranscriptionResult]:
        statuses = request.statuses if request.statuses else None
        return await self.database.export_transcriptions(statuses)

    async def export_pager_messages(
        self, stream_id: str
    ) -> List[TranscriptionResult]:
        stream = self.streams.get(stream_id)
        if not stream:
            raise ValueError("Stream not found")
        if stream.source != StreamSource.PAGER:
            raise ValueError("Stream does not accept pager messages")
        return await self.database.export_pager_messages(stream_id)

    def _delete_recordings(self, stream_id: str) -> None:
        if not RECORDINGS_DIR.exists():
            return
        for file in RECORDINGS_DIR.glob(f"stream-{stream_id}-*.wav"):
            try:
                file.unlink()
            except OSError:
                LOGGER.warning("Failed to remove recording %s", file)

    def _start_retention_task(self) -> None:
        if self._retention_task and not self._retention_task.done():
            return
        stop_event = asyncio.Event()
        self._retention_stop = stop_event
        self._retention_task = asyncio.create_task(self._retention_loop(stop_event))

    async def _stop_retention_task(self) -> None:
        task = self._retention_task
        if task is None:
            return
        stop_event = self._retention_stop
        if stop_event is not None:
            stop_event.set()
        self._retention_task = None
        self._retention_stop = None
        try:
            await task
        except asyncio.CancelledError:  # pragma: no cover - shutdown cancellation
            pass

    async def _retention_loop(self, stop_event: asyncio.Event) -> None:
        try:
            while True:
                await self._prune_expired_recordings()
                try:
                    await asyncio.wait_for(
                        stop_event.wait(), timeout=RETENTION_SWEEP_INTERVAL_SECONDS
                    )
                    break
                except asyncio.TimeoutError:
                    continue
        except asyncio.CancelledError:  # pragma: no cover - shutdown cancellation
            pass

    async def _prune_expired_recordings(self) -> None:
        """Remove on-disk recordings once they exceed their retention window."""

        directory = RECORDINGS_DIR
        if not directory.exists():
            return

        async with self._lock:
            retention_overrides = {
                stream_id: stream.recordingRetentionSeconds
                for stream_id, stream in self.streams.items()
            }

        now_ts = utcnow().timestamp()
        for file_path in directory.glob("stream-*.wav"):
            stream_id = self._extract_stream_id_from_recording(file_path)
            if not stream_id:
                continue
            if stream_id in retention_overrides:
                retention = retention_overrides[stream_id]
            else:
                retention = float(DEFAULT_RECORDING_RETENTION_SECONDS)
            if retention is None:
                continue
            try:
                stat_result = file_path.stat()
            except OSError:
                continue
            age_seconds = now_ts - stat_result.st_mtime
            if age_seconds < retention:
                continue
            try:
                file_path.unlink()
            except OSError:
                LOGGER.warning("Failed to remove expired recording %s", file_path)
            else:
                LOGGER.debug(
                    "Removed expired recording %s (age %.0fs >= %.0fs retention)",
                    file_path,
                    age_seconds,
                    retention,
                )

    @staticmethod
    def _extract_stream_id_from_recording(file_path: Path) -> Optional[str]:
        """Return the stream id encoded in a recording filename."""

        name = file_path.name if isinstance(file_path, Path) else str(file_path)
        if not name.startswith("stream-") or not name.endswith(".wav"):
            return None
        stem = name[:-4]
        remainder = stem[len("stream-") :]
        stream_id, sep, timestamp = remainder.rpartition("-")
        if not sep or not stream_id or not timestamp.isdigit():
            return None
        return stream_id

    async def _apply_default_preroll(self, stream: Stream) -> None:
        if stream.source != StreamSource.AUDIO:
            return
        resolved = resolve_ignore_first_seconds(
            stream.source, stream.url, stream.ignoreFirstSeconds
        )
        if resolved != stream.ignoreFirstSeconds:
            stream.ignoreFirstSeconds = resolved
            await self._save_stream(stream)

    async def _handle_transcription(self, transcription: TranscriptionResult) -> None:
        stream = self.streams.get(transcription.streamId)
        if not stream:
            return
        stream.transcriptions.insert(0, transcription)
        if len(stream.transcriptions) > 100:
            stream.transcriptions = stream.transcriptions[:100]
        if stream.lastActivityAt != transcription.timestamp:
            stream.lastActivityAt = transcription.timestamp
            await self._update_stream_activity(stream.id, transcription.timestamp)
        current_event_time = self._last_event_timestamps.get(stream.id)
        if (
            current_event_time is None
            or transcription.timestamp > current_event_time
        ):
            self._last_event_timestamps[stream.id] = transcription.timestamp
        await self.broadcaster.publish(
            StreamEvent("transcription", transcription.model_dump(by_alias=True))
        )

    async def _record_system_event(
        self,
        stream: Stream,
        event_type: TranscriptionEventType,
        message: str,
        trigger: Optional[SystemEventTrigger],
        *,
        source: Optional[str] = None,
    ) -> None:
        trigger_suffix = _format_trigger_suffix(trigger)
        event_text = f"{message} ({trigger_suffix})"
        existing_event = await self.database.load_last_system_event(stream.id)
        if (
            existing_event
            and existing_event.eventType == event_type
            and existing_event.text == event_text
        ):
            return
        timestamp = utcnow()
        last_activity = self._last_event_timestamps.get(stream.id)
        if stream.lastActivityAt:
            if last_activity is None or stream.lastActivityAt > last_activity:
                last_activity = stream.lastActivityAt
        if last_activity is not None and timestamp <= last_activity:
            timestamp = last_activity + timedelta(microseconds=1)

        # Build eventMetadata for tracing where this event originated
        event_metadata = {
            "trigger_type": trigger.type.value if trigger else "unspecified",
            "source": source or "status_change",
        }
        if trigger and trigger.detail:
            event_metadata["trigger_detail"] = trigger.detail

        transcription = TranscriptionResult(
            id=str(uuid.uuid4()),
            streamId=stream.id,
            text=event_text,
            timestamp=timestamp,
            eventType=event_type,
            eventMetadata=event_metadata,
        )
        self._last_event_timestamps[stream.id] = timestamp
        try:
            await self._append_transcription(transcription)
            await self._handle_transcription(transcription)
        except Exception:
            current_timestamp = self._last_event_timestamps.get(stream.id)
            if current_timestamp == timestamp:
                self._last_event_timestamps.pop(stream.id, None)
            raise

    async def ingest_pager_message(
        self, stream_id: str, request: PagerWebhookRequest
    ) -> TranscriptionResult:
        stream = self.streams.get(stream_id)
        if not stream:
            raise ValueError("Stream not found")
        if stream.source != StreamSource.PAGER:
            raise ValueError("Stream does not accept pager messages")

        timestamp = request.timestamp or utcnow()
        text_parts: List[str] = []
        base_message = request.message.strip()
        if request.sender:
            sender = request.sender.strip()
            if sender:
                if base_message:
                    text_parts.append(f"{sender}: {base_message}")
                else:
                    text_parts.append(sender)
            elif base_message:
                text_parts.append(base_message)
        elif base_message:
            text_parts.append(base_message)

        if request.details:
            for detail in request.details:
                detail_text = detail.strip()
                if detail_text:
                    text_parts.append(f"• {detail_text}")

        if request.priority:
            priority = request.priority.strip()
            if priority:
                text_parts.append(f"Priority: {priority}")

        if not text_parts:
            text_parts.append("Pager event received with no message body")

        text = "\n".join(text_parts)
        transcription = TranscriptionResult(
            id=str(uuid.uuid4()),
            streamId=stream.id,
            text=text,
            timestamp=timestamp,
            confidence=None,
            duration=None,
            segments=None,
        )
        if request.incident:
            transcription.pagerIncident = request.incident
        alerts = self.alert_evaluator.evaluate(text)
        if alerts:
            transcription.alerts = alerts
        await self._append_transcription(transcription)
        await self._handle_transcription(transcription)
        return transcription

    async def _handle_status_change(self, stream: Stream, status: StreamStatus) -> None:
        previous_status = stream.status
        event_details: Optional[tuple[TranscriptionEventType, str, str]] = None
        swallow_exception = False
        clear_stop_trigger = False
        event_lock: Optional[asyncio.Lock] = None
        needs_alignment = False
        async with self._lock:
            stream.status = status
            if status == StreamStatus.ERROR:
                LOGGER.error(
                    "Stream %s entered error state: %s", stream.id, stream.error
                )
            if stream.source == StreamSource.AUDIO:
                stop_trigger = self._stop_triggers.get(stream.id)
                if status in (StreamStatus.STOPPED, StreamStatus.ERROR):
                    self.workers.pop(stream.id, None)
                if status == StreamStatus.STOPPED and stream.enabled:
                    if stop_trigger != SystemEventTrigger.service_shutdown():
                        needs_alignment = True
                elif status == StreamStatus.TRANSCRIBING and not stream.enabled:
                    needs_alignment = True
                if (
                    status == StreamStatus.TRANSCRIBING
                    and previous_status != StreamStatus.TRANSCRIBING
                ):
                    # Reset restart counter on successful start
                    self._reset_restart_counter(stream.id)
                    trigger_reason = (
                        self._start_triggers.pop(stream.id, None)
                        or SystemEventTrigger.system_activity()
                    )
                    event_details = (
                        TranscriptionEventType.RECORDING_STARTED,
                        RECORDING_STARTED_MESSAGE,
                        trigger_reason,
                    )
                elif status in (StreamStatus.STOPPED, StreamStatus.ERROR):
                    shutdown_trigger = stop_trigger
                    if (
                        previous_status != StreamStatus.TRANSCRIBING
                        and not shutdown_trigger
                    ):
                        pass
                    else:
                        if shutdown_trigger:
                            trigger_reason = shutdown_trigger
                            clear_stop_trigger = True
                        elif status == StreamStatus.ERROR:
                            trigger_reason = SystemEventTrigger.stream_error(
                                stream.error
                            )
                        else:
                            trigger_reason = SystemEventTrigger.source_stream_ended()
                        event_details = (
                            TranscriptionEventType.RECORDING_STOPPED,
                            RECORDING_STOPPED_MESSAGE,
                            trigger_reason,
                        )
                        swallow_exception = True
            if event_details:
                event_lock = self._event_locks.get(stream.id)
                if event_lock is None:
                    event_lock = asyncio.Lock()
                    self._event_locks[stream.id] = event_lock
                await event_lock.acquire()
        await self._broadcast_streams()
        if event_details and event_lock:
            event_type, message, trigger_reason = event_details
            try:
                await self._record_system_event(
                    stream,
                    event_type,
                    message,
                    trigger=trigger_reason,
                    source="handle_status_change",
                )
            except Exception:
                if swallow_exception:  # pragma: no cover - defensive logging
                    LOGGER.exception(
                        "Failed to record stop event for stream %s", stream.id
                    )
                else:
                    raise
            else:
                if clear_stop_trigger:
                    self._stop_triggers.pop(stream.id, None)
            finally:
                event_lock.release()
        if needs_alignment:
            await self._ensure_stream_alignment(
                stream.id, trigger=SystemEventTrigger.automatic_synchronization()
            )

        # Schedule auto-restart for ERROR state on enabled audio streams
        if (
            status == StreamStatus.ERROR
            and stream.source == StreamSource.AUDIO
            and stream.enabled
            and not self._shutting_down
        ):
            self._schedule_auto_restart(stream.id)

    def _schedule_auto_restart(self, stream_id: str) -> None:
        """Schedule an automatic restart attempt for a failed stream."""
        # Cancel any existing restart task for this stream
        existing_task = self._restart_tasks.pop(stream_id, None)
        if existing_task and not existing_task.done():
            existing_task.cancel()

        # Increment attempt counter
        attempt = self._restart_attempts.get(stream_id, 0) + 1
        self._restart_attempts[stream_id] = attempt

        if attempt > AUTO_RESTART_MAX_ATTEMPTS:
            LOGGER.error(
                "Stream %s auto-restart disabled after %d failed attempts",
                stream_id,
                AUTO_RESTART_MAX_ATTEMPTS,
            )
            return

        # Calculate delay with exponential backoff
        delay = min(
            AUTO_RESTART_DELAY_SECONDS * (2 ** (attempt - 1)),
            AUTO_RESTART_MAX_DELAY_SECONDS,
        )

        LOGGER.info(
            "Stream %s will auto-restart in %.0fs (attempt %d/%d)",
            stream_id,
            delay,
            attempt,
            AUTO_RESTART_MAX_ATTEMPTS,
        )

        # Schedule the restart task
        task = asyncio.create_task(
            self._delayed_restart(stream_id, delay, attempt),
            name=f"auto-restart-{stream_id}",
        )
        self._restart_tasks[stream_id] = task

    async def _delayed_restart(
        self, stream_id: str, delay: float, attempt: int
    ) -> None:
        """Wait and then attempt to restart a stream."""
        try:
            await asyncio.sleep(delay)

            if self._shutting_down:
                LOGGER.debug(
                    "Skipping auto-restart for stream %s (service shutting down)",
                    stream_id,
                )
                return

            async with self._lock:
                stream = self.streams.get(stream_id)
                if stream is None:
                    LOGGER.debug(
                        "Stream %s no longer exists, skipping auto-restart", stream_id
                    )
                    return

                if not stream.enabled:
                    LOGGER.debug(
                        "Stream %s disabled, skipping auto-restart", stream_id
                    )
                    return

                if stream.status == StreamStatus.TRANSCRIBING:
                    LOGGER.debug(
                        "Stream %s already running, skipping auto-restart", stream_id
                    )
                    return

            LOGGER.info(
                "Auto-restarting stream %s (attempt %d/%d)",
                stream_id,
                attempt,
                AUTO_RESTART_MAX_ATTEMPTS,
            )

            trigger = SystemEventTrigger.automatic_restart_after_error(attempt)
            await self.start_stream(stream_id, trigger=trigger)

            # Reset attempt counter on successful start
            # (the counter stays until next successful transcription,
            # which happens in _handle_status_change when status becomes TRANSCRIBING)

        except asyncio.CancelledError:
            LOGGER.debug("Auto-restart task for stream %s was cancelled", stream_id)
        except Exception:
            LOGGER.exception(
                "Failed to auto-restart stream %s (attempt %d)", stream_id, attempt
            )
        finally:
            self._restart_tasks.pop(stream_id, None)

    def _reset_restart_counter(self, stream_id: str) -> None:
        """Reset the restart attempt counter after successful recovery."""
        if stream_id in self._restart_attempts:
            LOGGER.debug(
                "Stream %s recovered, resetting restart counter", stream_id
            )
            del self._restart_attempts[stream_id]

    async def _handle_upstream_disconnect(
        self,
        stream: Stream,
        attempt: int,
        delay_seconds: float,
        reason: Optional[str] = None,
    ) -> None:
        async with self._lock:
            current = self.streams.get(stream.id)
        if not current or current.source not in (StreamSource.AUDIO, StreamSource.REMOTE):
            return
        attempt_value = max(attempt, 1)
        retry_phrase = _format_retry_phrase(delay_seconds)
        message_parts = [UPSTREAM_DISCONNECTED_MESSAGE]
        normalized_reason = reason.strip() if isinstance(reason, str) else None
        if normalized_reason:
            message_parts.append(normalized_reason)
        message_parts.append(f"{retry_phrase} (attempt {attempt_value})")
        message = "; ".join(message_parts)
        trigger_detail = (
            normalized_reason if normalized_reason else "upstream stream disconnected"
        )
        trigger = SystemEventTrigger.system_activity(trigger_detail)
        await self._record_system_event(
            current,
            TranscriptionEventType.UPSTREAM_DISCONNECTED,
            message,
            trigger,
            source="upstream_disconnect",
        )

    async def _handle_upstream_reconnect(self, stream: Stream, attempt: int) -> None:
        async with self._lock:
            current = self.streams.get(stream.id)
        if not current or current.source not in (StreamSource.AUDIO, StreamSource.REMOTE):
            return
        attempt_value = max(attempt, 1)
        attempt_label = "attempt" if attempt_value == 1 else "attempts"
        message = (
            f"{UPSTREAM_RECONNECTED_MESSAGE} after {attempt_value} {attempt_label}"
        )
        trigger = SystemEventTrigger.system_activity("upstream connection restored")
        await self._record_system_event(
            current,
            TranscriptionEventType.UPSTREAM_RECONNECTED,
            message,
            trigger,
            source="upstream_reconnect",
        )

    async def _broadcast_streams(self, include_transcriptions: bool = False) -> None:
        summary_payload: List[dict] = []
        detailed_payload: List[dict] = []
        for stream in self.streams.values():
            summary = stream.model_dump(by_alias=True, exclude={"transcriptions"})
            if stream.source == StreamSource.REMOTE:
                worker = self.workers.get(stream.id)
                if worker is not None:
                    try:
                        states = worker.get_remote_upstream_states()
                    except Exception:
                        LOGGER.warning(
                            "Failed to get remote upstream states for stream %s during broadcast",
                            stream.id,
                            exc_info=True,
                        )
                        states = []
                    if states:
                        summary["upstreams"] = [s.model_dump(by_alias=True) for s in states]
            summary_payload.append(summary)
            if include_transcriptions:
                stream_data = stream.model_dump(by_alias=True)
                if stream.source == StreamSource.REMOTE:
                    worker = self.workers.get(stream.id)
                    if worker is not None:
                        try:
                            states = worker.get_remote_upstream_states()
                        except Exception:
                            LOGGER.warning(
                                "Failed to get remote upstream states for stream %s during detailed broadcast",
                                stream.id,
                                exc_info=True,
                            )
                            states = []
                        if states:
                            stream_data["upstreams"] = [s.model_dump(by_alias=True) for s in states]
                if stream.transcriptions:
                    stream_data["transcriptions"] = [
                        transcription.model_dump(by_alias=True, exclude={"segments"})
                        for transcription in stream.transcriptions
                    ]
                else:
                    stream_data["transcriptions"] = []
                detailed_payload.append(stream_data)

        json_ready_summary = to_jsonable_python(summary_payload)
        signature = json.dumps(
            json_ready_summary,
            sort_keys=True,
            ensure_ascii=False,
            separators=(",", ":"),
        )

        if include_transcriptions:
            payload = detailed_payload
        else:
            if signature == self._last_streams_signature:
                return
            payload = summary_payload

        self._last_streams_signature = signature
        await self.broadcaster.publish(StreamEvent("streams_update", payload))

    async def shutdown(self) -> None:
        # Prevent new auto-restart tasks from being scheduled
        self._shutting_down = True

        # Cancel any pending auto-restart tasks
        for stream_id, task in list(self._restart_tasks.items()):
            if not task.done():
                task.cancel()
        self._restart_tasks.clear()
        self._restart_attempts.clear()

        await self._stop_retention_task()
        audio_streams: List[Stream] = []
        async with self._lock:
            workers = list(self.workers.items())
            for stream_id, _ in workers:
                stream = self.streams.get(stream_id)
                if stream and stream.source in (StreamSource.AUDIO, StreamSource.REMOTE):
                    audio_streams.append(stream)
                    self._stop_triggers[stream.id] = (
                        SystemEventTrigger.service_shutdown()
                    )
            self.workers.clear()
        for stream_id, worker in workers:
            try:
                await asyncio.wait_for(
                    worker.stop(), timeout=WORKER_STOP_TIMEOUT_SECONDS
                )
            except asyncio.TimeoutError:
                LOGGER.warning(
                    "Worker %s did not stop within %.0fs, continuing shutdown",
                    stream_id,
                    WORKER_STOP_TIMEOUT_SECONDS,
                )
            except Exception:  # pragma: no cover - defensive cleanup
                LOGGER.exception("Failed to stop worker %s during shutdown", stream_id)
        for stream in audio_streams:
            if stream.id not in self._stop_triggers:
                continue
            try:
                trigger_reason = self._stop_triggers.pop(
                    stream.id, SystemEventTrigger.service_shutdown()
                )
                await self._record_system_event(
                    stream,
                    TranscriptionEventType.RECORDING_STOPPED,
                    RECORDING_STOPPED_MESSAGE,
                    trigger=trigger_reason,
                    source="shutdown",
                )
            except Exception:  # pragma: no cover - defensive logging
                LOGGER.exception(
                    "Failed to record shutdown stop event for stream %s",
                    stream.id,
                )
        # Do not persist transient statuses during shutdown.
        if self._owns_executor:
            # Avoid blocking on long-running inference during service shutdown.
            await self._executor.close(wait=False)


__all__ = [
    "StreamManager",
    "StreamEvent",
    "StreamEventBroadcaster",
    "SystemEventTrigger",
    "SystemEventTriggerType",
]
