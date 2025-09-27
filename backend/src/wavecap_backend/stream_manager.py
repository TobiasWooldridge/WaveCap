"""High level stream management orchestration."""

from __future__ import annotations

import asyncio
import json
import logging
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
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
from .stream_defaults import resolve_ignore_first_seconds

LOGGER = logging.getLogger(__name__)

RECORDING_STARTED_MESSAGE = "Recording and transcription started"
RECORDING_STOPPED_MESSAGE = "Recording and transcription stopped"
UPSTREAM_DISCONNECTED_MESSAGE = "Lost connection to upstream stream"
UPSTREAM_RECONNECTED_MESSAGE = "Reconnected to upstream stream"


class SystemEventTriggerType(str, Enum):
    """Enumerates reasons that can trigger system logging events."""

    USER_REQUEST = "user_request"
    AUTOMATIC_RESUME = "automatic_resume_after_restart"
    AUTOMATIC_SYNCHRONIZATION = "automatic_synchronization"
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
                LOGGER.debug("Dropping websocket event for slow subscriber")
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
        self._start_triggers: Dict[str, SystemEventTrigger] = {}
        self._stop_triggers: Dict[str, SystemEventTrigger] = {}
        self._last_event_timestamps: Dict[str, datetime] = {}
        self._event_locks: Dict[str, asyncio.Lock] = {}
        self._last_streams_signature: Optional[str] = None

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
        )

    async def _ensure_stream_alignment(
        self, stream_id: str, trigger: SystemEventTrigger
    ) -> None:
        worker_to_start: Optional[StreamWorker] = None
        worker_to_stop: Optional[StreamWorker] = None
        should_broadcast = False
        should_save = False
        async with self._lock:
            stream = self.streams.get(stream_id)
            if not stream:
                return
            if stream.source != StreamSource.AUDIO:
                if not stream.enabled:
                    stream.enabled = True
                    should_save = True
                if stream.status != StreamStatus.TRANSCRIBING:
                    stream.status = StreamStatus.TRANSCRIBING
                    should_save = True
                    should_broadcast = True
                if should_save:
                    await self._save_stream(stream)
                return

            if stream.enabled:
                if stream_id not in self.workers:
                    worker_to_start = self._create_worker(stream)
                    self.workers[stream_id] = worker_to_start
                    self._start_triggers[stream_id] = trigger
                    stream.status = StreamStatus.QUEUED
                    stream.error = None
                    should_broadcast = True
                    should_save = True
                elif stream.status == StreamStatus.STOPPED:
                    stream.status = StreamStatus.QUEUED
                    should_broadcast = True
                    should_save = True
            else:
                worker = self.workers.pop(stream_id, None)
                if worker:
                    self._stop_triggers[stream_id] = trigger
                    worker_to_stop = worker
                if stream.status != StreamStatus.STOPPED or stream.error:
                    stream.status = StreamStatus.STOPPED
                    stream.error = None
                    should_broadcast = True
                    should_save = True

            if should_save:
                await self._save_stream(stream)

        if worker_to_start:
            worker_to_start.start()
        if worker_to_stop:
            await worker_to_stop.stop()
        if should_broadcast or worker_to_start or worker_to_stop:
            await self._broadcast_streams()

    def _build_stream_from_config(
        self, stream_config: StreamConfig, existing: Optional[Stream]
    ) -> Stream:
        if stream_config.source == StreamSource.PAGER:
            url = (stream_config.url or f"/api/pager-feeds/{stream_config.id}").strip()
            base = existing or Stream(
                id=stream_config.id,
                name=stream_config.name,
                url=url,
                status=StreamStatus.TRANSCRIBING,
                enabled=True,
                createdAt=utcnow(),
                language=None,
                transcriptions=[],
                source=StreamSource.PAGER,
                webhookToken=stream_config.webhookToken,
                ignoreFirstSeconds=0.0,
            )
            return base.model_copy(
                update={
                    "name": stream_config.name,
                    "url": url,
                    "source": StreamSource.PAGER,
                    "webhookToken": stream_config.webhookToken,
                    "ignoreFirstSeconds": 0.0,
                    "language": None,
                    "enabled": True,
                    "status": StreamStatus.TRANSCRIBING,
                    "error": None,
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
                createdAt=utcnow(),
                language=language,
                transcriptions=[],
                source=StreamSource.AUDIO,
                webhookToken=None,
                ignoreFirstSeconds=ignore_seconds,
            )
        updates = {
            "name": stream_config.name,
            "url": url,
            "language": language,
            "source": StreamSource.AUDIO,
            "ignoreFirstSeconds": ignore_seconds,
            "webhookToken": None,
        }
        return existing.model_copy(update=updates)

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
            stream = self._build_stream_from_config(stream_config, existing)
            await self._save_stream(stream)
            streams.append(stream)
        streams_to_activate: List[Stream] = []
        for stream in streams:
            await self._apply_default_preroll(stream)
            if (
                stream.source == StreamSource.PAGER
                and stream.status != StreamStatus.ERROR
            ):
                stream.enabled = True
                if stream.status != StreamStatus.TRANSCRIBING:
                    stream.status = StreamStatus.TRANSCRIBING
                    await self._save_stream(stream)
            elif (
                stream.source == StreamSource.AUDIO
            ):
                if stream.enabled:
                    if stream.error:
                        stream.error = None
                        await self._save_stream(stream)
                    streams_to_activate.append(stream)
                elif stream.status != StreamStatus.STOPPED:
                    stream.status = StreamStatus.STOPPED
                    if stream.error:
                        stream.error = None
                    await self._save_stream(stream)
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
            LOGGER.info(
                "Synchronizing %d audio stream(s) with enabled state",
                len(streams_to_activate),
            )
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
            for stream in resumed_streams:
                try:
                    trigger = self._start_triggers.get(stream.id) or SystemEventTrigger.automatic_resume()
                    await self._record_system_event(
                        stream,
                        TranscriptionEventType.RECORDING_STARTED,
                        RECORDING_STARTED_MESSAGE,
                        trigger=trigger,
                    )
                except Exception:  # pragma: no cover - defensive startup
                    LOGGER.exception(
                        "Failed to record restart event for stream %s", stream.id
                    )

    def get_streams(self) -> List[Stream]:
        return [stream.model_copy() for stream in self.streams.values()]

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
                if stream.source != StreamSource.AUDIO and normalized_language:
                    raise ValueError("Language can only be set for audio streams")
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
        needs_alignment = False
        should_broadcast = False
        async with self._lock:
            stream = self.streams.get(stream_id)
            if not stream:
                raise ValueError("Stream not found")
            stream.enabled = True
            if stream.source != StreamSource.AUDIO:
                LOGGER.info(
                    "Start requested for non-audio stream %s; ignoring", stream_id
                )
                stream.status = StreamStatus.TRANSCRIBING
                stream.error = None
                should_broadcast = True
            else:
                needs_alignment = True
            await self._save_stream(stream)
        if needs_alignment:
            await self._ensure_stream_alignment(stream_id, trigger)
        if should_broadcast:
            await self._broadcast_streams()

    async def stop_stream(
        self,
        stream_id: str,
        trigger: Optional[SystemEventTrigger] = None,
    ) -> None:
        trigger = trigger or SystemEventTrigger.user_request()
        worker: Optional[StreamWorker] = None
        should_broadcast = False
        was_transcribing = False
        needs_alignment = False
        async with self._lock:
            stream = self.streams.get(stream_id)
            if stream and stream.source != StreamSource.AUDIO:
                LOGGER.info(
                    "Stop requested for non-audio stream %s; ignoring", stream_id
                )
                stream.status = StreamStatus.TRANSCRIBING
                stream.error = None
                await self._save_stream(stream)
                should_broadcast = True
                stream = None
            else:
                worker = self.workers.pop(stream_id, None)
                if stream:
                    was_transcribing = stream.status == StreamStatus.TRANSCRIBING
                    stream.enabled = False
                    stream.status = StreamStatus.STOPPED
                    stream.error = None
                    needs_alignment = True
                    await self._save_stream(stream)
                    should_broadcast = True
            if worker and was_transcribing:
                self._stop_triggers[stream_id] = trigger
        if worker:
            await worker.stop()
        if needs_alignment:
            await self._ensure_stream_alignment(stream_id, trigger)
        if should_broadcast:
            await self._broadcast_streams()

    async def reset_stream(self, stream_id: str) -> None:
        await self.stop_stream(stream_id)
        stream = self.streams.get(stream_id)
        if not stream:
            return
        stream.transcriptions.clear()
        await self._delete_stream(stream_id)
        self._last_event_timestamps.pop(stream_id, None)
        stream.status = (
            StreamStatus.TRANSCRIBING
            if stream.source == StreamSource.PAGER
            else StreamStatus.STOPPED
        )
        stream.error = None
        stream.createdAt = utcnow()
        await self._save_stream(stream)
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
    ) -> TranscriptionQueryResponse:
        transcriptions, has_more_before = await self.database.query_transcriptions(
            stream_id,
            limit,
            before,
            after,
        )
        return TranscriptionQueryResponse(
            transcriptions=transcriptions,
            hasMoreAfter=False,
            hasMoreBefore=has_more_before,
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

        transcription = TranscriptionResult(
            id=str(uuid.uuid4()),
            streamId=stream.id,
            text=event_text,
            timestamp=timestamp,
            eventType=event_type,
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
        await self._save_stream(stream)
        await self._broadcast_streams()
        if event_details and event_lock:
            event_type, message, trigger_reason = event_details
            try:
                await self._record_system_event(
                    stream,
                    event_type,
                    message,
                    trigger=trigger_reason,
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

    async def _handle_upstream_disconnect(
        self, stream: Stream, attempt: int, delay_seconds: float
    ) -> None:
        async with self._lock:
            current = self.streams.get(stream.id)
        if not current or current.source != StreamSource.AUDIO:
            return
        attempt_value = max(attempt, 1)
        retry_phrase = _format_retry_phrase(delay_seconds)
        message = (
            f"{UPSTREAM_DISCONNECTED_MESSAGE}; {retry_phrase} "
            f"(attempt {attempt_value})"
        )
        trigger = SystemEventTrigger.system_activity("upstream stream disconnected")
        await self._record_system_event(
            current,
            TranscriptionEventType.UPSTREAM_DISCONNECTED,
            message,
            trigger,
        )

    async def _handle_upstream_reconnect(self, stream: Stream, attempt: int) -> None:
        async with self._lock:
            current = self.streams.get(stream.id)
        if not current or current.source != StreamSource.AUDIO:
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
        )

    async def _broadcast_streams(self, include_transcriptions: bool = False) -> None:
        summary_payload: List[dict] = []
        detailed_payload: List[dict] = []
        for stream in self.streams.values():
            summary = stream.model_dump(by_alias=True, exclude={"transcriptions"})
            summary_payload.append(summary)
            if include_transcriptions:
                stream_data = stream.model_dump(by_alias=True)
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
        audio_streams: List[Stream] = []
        async with self._lock:
            workers = list(self.workers.items())
            for stream_id, _ in workers:
                stream = self.streams.get(stream_id)
                if stream and stream.source == StreamSource.AUDIO:
                    audio_streams.append(stream)
                    self._stop_triggers[stream.id] = (
                        SystemEventTrigger.service_shutdown()
                    )
            self.workers.clear()
        for stream_id, worker in workers:
            try:
                await worker.stop()
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
                )
            except Exception:  # pragma: no cover - defensive logging
                LOGGER.exception(
                    "Failed to record shutdown stop event for stream %s",
                    stream.id,
                )
        if audio_streams:
            async with self._lock:
                for stream in audio_streams:
                    current = self.streams.get(stream.id)
                    if not current:
                        continue
                    current.status = StreamStatus.TRANSCRIBING
                    current.error = None
                    await self._save_stream(current)
        if self._owns_executor:
            await self._executor.close()


__all__ = [
    "StreamManager",
    "StreamEvent",
    "StreamEventBroadcaster",
    "SystemEventTrigger",
    "SystemEventTriggerType",
]
