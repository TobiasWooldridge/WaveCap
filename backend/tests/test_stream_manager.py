import asyncio
from typing import Iterable

import pytest

from wavecap_backend.database import StreamDatabase
from wavecap_backend.datetime_utils import utcnow
from wavecap_backend.models import (
    PagerIncidentDetails,
    PagerWebhookRequest,
    StreamConfig,
    StreamSource,
    StreamStatus,
    TranscriptionEventType,
    UpdateStreamRequest,
)
from wavecap_backend.stream_defaults import BROADCASTIFY_PREROLL_SECONDS
from wavecap_backend.stream_manager import (
    RECORDING_STARTED_MESSAGE,
    RECORDING_STOPPED_MESSAGE,
    StreamEvent,
    StreamEventBroadcaster,
    StreamManager,
    SystemEventTrigger,
    UPSTREAM_DISCONNECTED_MESSAGE,
    UPSTREAM_RECONNECTED_MESSAGE,
)
from wavecap_backend.whisper_transcriber import PassthroughTranscriber


class DummyWorker:
    def __init__(self, stream, **kwargs):
        self.stream = stream
        self.started = False
        self._on_status_change = kwargs.get("on_status_change")

    def start(self) -> None:
        self.started = True
        if self._on_status_change:
            loop = asyncio.get_running_loop()
            loop.create_task(
                self._on_status_change(self.stream, StreamStatus.TRANSCRIBING)
            )

    async def stop(self) -> None:
        self.started = False
        if self._on_status_change:
            await self._on_status_change(self.stream, StreamStatus.STOPPED)


def _audio_stream(
    *,
    stream_id: str = "audio-demo",
    name: str = "Audio demo",
    url: str = "https://example.com/audio-demo",
    enabled: bool = False,
    ignore_first_seconds: float = 0.0,
    language: str | None = None,
) -> StreamConfig:
    return StreamConfig(
        id=stream_id,
        name=name,
        url=url,
        enabled=enabled,
        ignoreFirstSeconds=ignore_first_seconds,
        language=language,
    )


def _pager_stream(
    *,
    stream_id: str = "pager-demo",
    name: str = "Pager demo",
    token: str = "pager-token",
    url: str | None = None,
) -> StreamConfig:
    return StreamConfig(
        id=stream_id,
        name=name,
        source=StreamSource.PAGER,
        webhookToken=token,
        url=url,
    )


def _build_manager(config, tmp_path, worker_factory=DummyWorker) -> StreamManager:
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    return StreamManager(
        config,
        db,
        PassthroughTranscriber("test"),
        worker_factory=worker_factory,
    )


async def _start_manager(manager: StreamManager) -> StreamManager:
    await manager.initialize()
    return manager


async def _shutdown_manager(manager: StreamManager) -> None:
    await manager.shutdown()


def _collect_event_texts(events: Iterable[StreamEvent]) -> list[str]:
    texts: list[str] = []
    for event in events:
        payload = event.payload
        if isinstance(payload, dict):
            text = payload.get("text")
            if isinstance(text, str):
                texts.append(text)
        # Ignore non-dict payloads (e.g., streams_update broadcasts)
    return texts


@pytest.mark.asyncio
async def test_initialize_creates_streams_from_config(minimal_config, tmp_path):
    config = minimal_config.model_copy(deep=True)
    config.streams = [
        _audio_stream(stream_id="dispatch", enabled=True),
        _pager_stream(stream_id="pager-1", token="secret-token"),
    ]
    manager = _build_manager(config, tmp_path)
    await _start_manager(manager)
    try:
        streams = sorted(manager.get_streams(), key=lambda stream: stream.id)
        assert {stream.id for stream in streams} == {"dispatch", "pager-1"}

        dispatch = next(stream for stream in streams if stream.id == "dispatch")
        assert dispatch.source == StreamSource.AUDIO
        assert dispatch.url == "https://example.com/audio-demo"
        assert dispatch.webhookToken is None
        assert dispatch.enabled is True

        pager = next(stream for stream in streams if stream.id == "pager-1")
        assert pager.source == StreamSource.PAGER
        assert pager.webhookToken == "secret-token"
        assert pager.enabled is True
        assert pager.status == StreamStatus.TRANSCRIBING
        assert pager.url == "/api/pager-feeds/pager-1"
    finally:
        await _shutdown_manager(manager)


@pytest.mark.asyncio
async def test_initialize_removes_missing_streams(minimal_config, tmp_path):
    config_with_stream = minimal_config.model_copy(deep=True)
    config_with_stream.streams = [_audio_stream(stream_id="keep")]
    manager_one = _build_manager(config_with_stream, tmp_path)
    await _start_manager(manager_one)
    await _shutdown_manager(manager_one)

    empty_config = minimal_config.model_copy(deep=True)
    empty_config.streams = []
    manager_two = _build_manager(empty_config, tmp_path)
    await _start_manager(manager_two)
    try:
        assert manager_two.get_streams() == []
    finally:
        await _shutdown_manager(manager_two)


@pytest.mark.asyncio
async def test_start_and_stop_stream_records_events(minimal_config, tmp_path):
    config = minimal_config.model_copy(deep=True)
    config.streams = [_audio_stream(enabled=False)]
    manager = _build_manager(config, tmp_path)
    await _start_manager(manager)
    try:
        stream = manager.get_streams()[0]
        assert stream.status == StreamStatus.STOPPED

        await manager.start_stream(stream.id)
        await asyncio.sleep(0)
        active = manager.get_streams()[0]
        assert active.status == StreamStatus.TRANSCRIBING
        assert active.enabled is True

        await manager.stop_stream(stream.id)
        await asyncio.sleep(0)
        stopped = manager.get_streams()[0]
        assert stopped.status == StreamStatus.STOPPED
        assert stopped.enabled is False

        recent = await manager.database.load_recent_transcriptions(stream.id, limit=4)
        event_types = [event.eventType for event in recent]
        assert TranscriptionEventType.RECORDING_STARTED in event_types
        assert TranscriptionEventType.RECORDING_STOPPED in event_types
    finally:
        await _shutdown_manager(manager)


@pytest.mark.asyncio
async def test_update_stream_fields(minimal_config, tmp_path):
    config = minimal_config.model_copy(deep=True)
    config.streams = [_audio_stream()]
    manager = _build_manager(config, tmp_path)
    await _start_manager(manager)
    try:
        stream = manager.get_streams()[0]
        await manager.update_stream(
            stream.id,
            UpdateStreamRequest(name="Renamed", language="en", ignoreFirstSeconds=12),
        )
        updated = manager.get_streams()[0]
        assert updated.name == "Renamed"
        assert updated.language == "en"
        assert updated.ignoreFirstSeconds == 12
    finally:
        await _shutdown_manager(manager)


@pytest.mark.asyncio
async def test_reset_stream_clears_transcriptions(minimal_config, tmp_path):
    config = minimal_config.model_copy(deep=True)
    config.streams = [_audio_stream(enabled=False)]
    manager = _build_manager(config, tmp_path)
    await _start_manager(manager)
    try:
        stream = manager.get_streams()[0]
        await manager.start_stream(stream.id)
        await asyncio.sleep(0)
        await manager.stop_stream(stream.id)
        await asyncio.sleep(0)

        await manager.reset_stream(stream.id)
        reset = manager.get_streams()[0]
        assert reset.transcriptions == []
        records, _ = await manager.database.query_transcriptions(
            stream.id, limit=10
        )
        assert records == []
    finally:
        await _shutdown_manager(manager)


@pytest.mark.asyncio
async def test_initialize_recreates_stream_on_source_change(minimal_config, tmp_path):
    config_audio = minimal_config.model_copy(deep=True)
    config_audio.streams = [_audio_stream(stream_id="mixed", enabled=False)]
    manager_audio = _build_manager(config_audio, tmp_path)
    await _start_manager(manager_audio)
    await _shutdown_manager(manager_audio)

    config_pager = minimal_config.model_copy(deep=True)
    config_pager.streams = [_pager_stream(stream_id="mixed", token="new-token")]
    manager_pager = _build_manager(config_pager, tmp_path)
    await _start_manager(manager_pager)
    try:
        streams = manager_pager.get_streams()
        assert len(streams) == 1
        stream = streams[0]
        assert stream.source == StreamSource.PAGER
        assert stream.webhookToken == "new-token"
        assert stream.status == StreamStatus.TRANSCRIBING
    finally:
        await _shutdown_manager(manager_pager)


@pytest.mark.asyncio
async def test_ingest_pager_message_appends_transcription(minimal_config, tmp_path):
    config = minimal_config.model_copy(deep=True)
    config.streams = [_pager_stream(token="pager-secret")]
    manager = _build_manager(config, tmp_path)
    await _start_manager(manager)
    try:
        stream = manager.get_streams()[0]
        request = PagerWebhookRequest(
            message="Structure fire reported",
            sender="Dispatch",
            priority="High",
            details=["Engine 4 responding"],
            incident=PagerIncidentDetails(incidentId="INC-42"),
        )
        result = await manager.ingest_pager_message(stream.id, request)
        assert "Dispatch" in result.text
        assert "Engine 4 responding" in result.text
        assert result.eventType == TranscriptionEventType.TRANSCRIPTION

        transcriptions = await manager.database.load_recent_transcriptions(
            stream.id, limit=1
        )
        assert transcriptions[0].id == result.id
    finally:
        await _shutdown_manager(manager)


@pytest.mark.asyncio
async def test_initialize_applies_broadcastify_preroll(minimal_config, tmp_path):
    config = minimal_config.model_copy(deep=True)
    config.streams = [
        _audio_stream(
            url="https://broadcastify.example.com/feed",
            ignore_first_seconds=0,
            enabled=False,
        )
    ]
    manager = _build_manager(config, tmp_path)
    await _start_manager(manager)
    try:
        stream = manager.get_streams()[0]
        assert stream.ignoreFirstSeconds == BROADCASTIFY_PREROLL_SECONDS
    finally:
        await _shutdown_manager(manager)


@pytest.mark.asyncio
async def test_broadcaster_emits_system_events(minimal_config, tmp_path):
    config = minimal_config.model_copy(deep=True)
    config.streams = [_audio_stream(enabled=False)]
    broadcaster = StreamEventBroadcaster()
    manager = StreamManager(
        config,
        StreamDatabase(tmp_path / "runtime.sqlite"),
        PassthroughTranscriber("test"),
        worker_factory=DummyWorker,
    )
    manager.broadcaster = broadcaster
    await _start_manager(manager)
    try:
        stream = manager.get_streams()[0]
        queue = await broadcaster.register()

        await manager.start_stream(stream.id)
        await asyncio.sleep(0)
        await manager.stop_stream(stream.id)
        await asyncio.sleep(0)

        system_trigger = SystemEventTrigger.system_activity("maintenance")
        await manager._record_system_event(
            stream,
            TranscriptionEventType.UPSTREAM_DISCONNECTED,
            UPSTREAM_DISCONNECTED_MESSAGE,
            system_trigger,
        )
        await manager._record_system_event(
            stream,
            TranscriptionEventType.UPSTREAM_RECONNECTED,
            UPSTREAM_RECONNECTED_MESSAGE,
            SystemEventTrigger.system_activity("reconnected"),
        )

        events = []
        while not queue.empty():
            events.append(queue.get_nowait())
        texts = _collect_event_texts(events)
        assert any(RECORDING_STARTED_MESSAGE in text for text in texts)
        assert any(RECORDING_STOPPED_MESSAGE in text for text in texts)
        assert any(UPSTREAM_DISCONNECTED_MESSAGE in text for text in texts)
        assert any(UPSTREAM_RECONNECTED_MESSAGE in text for text in texts)
    finally:
        await _shutdown_manager(manager)
