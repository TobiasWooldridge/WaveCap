import asyncio
import uuid
from datetime import datetime, timedelta, timezone

import pytest

from wavecap_backend.database import StreamDatabase
from wavecap_backend.datetime_utils import utcnow
from wavecap_backend.models import (
    AddStreamRequest,
    PagerIncidentDetails,
    PagerWebhookRequest,
    Stream,
    StreamConfig,
    StreamSource,
    StreamStatus,
    TranscriptionEventType,
    TranscriptionResult,
    TranscriptionReviewStatus,
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


@pytest.mark.asyncio
async def test_stream_lifecycle(minimal_config, tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    manager = StreamManager(
        minimal_config, db, PassthroughTranscriber("test"), worker_factory=DummyWorker
    )
    await manager.initialize()

    assert manager.get_streams() == []

    stream = await manager.add_stream(
        AddStreamRequest(url="http://example.com/audio", name="Example")
    )
    assert stream.status == StreamStatus.STOPPED
    assert stream.enabled is False
    assert len(manager.get_streams()) == 1

    await manager.start_stream(stream.id)
    await asyncio.sleep(0)
    streams = manager.get_streams()
    assert streams[0].status == StreamStatus.TRANSCRIBING
    assert streams[0].enabled is True

    await manager.stop_stream(stream.id)
    await asyncio.sleep(0)
    streams = manager.get_streams()
    assert streams[0].status == StreamStatus.STOPPED
    assert streams[0].enabled is False

    recent = await manager.database.load_recent_transcriptions(stream.id, limit=4)
    assert [event.eventType for event in recent] == [
        TranscriptionEventType.RECORDING_STOPPED,
        TranscriptionEventType.RECORDING_STARTED,
    ]
    assert (
        recent[0].text
        == "Recording and transcription stopped (triggered by user request)"
    )
    assert (
        recent[1].text
        == "Recording and transcription started (triggered by user request)"
    )

    await manager.reset_stream(stream.id)
    streams = manager.get_streams()
    assert streams[0].transcriptions == []

    await manager.remove_stream(stream.id)
    assert manager.get_streams() == []


@pytest.mark.asyncio
async def test_update_stream_fields(minimal_config, tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    manager = StreamManager(
        minimal_config, db, PassthroughTranscriber("test"), worker_factory=DummyWorker
    )
    await manager.initialize()

    stream = await manager.add_stream(
        AddStreamRequest(url="http://example.com/audio", name="Initial")
    )

    updated = await manager.update_stream(
        stream.id, UpdateStreamRequest(name="Renamed stream")
    )
    assert updated.name == "Renamed stream"

    stored = manager.get_streams()[0]
    assert stored.name == "Renamed stream"


@pytest.mark.asyncio
async def test_stream_updates_are_deduplicated(minimal_config, tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    manager = StreamManager(
        minimal_config, db, PassthroughTranscriber("test"), worker_factory=DummyWorker
    )
    await manager.initialize()

    stream = await manager.add_stream(
        AddStreamRequest(url="http://example.com/audio", name="Example")
    )

    queue = await manager.broadcaster.register()

    await manager._broadcast_streams()
    assert queue.empty()

    await manager.update_stream(
        stream.id, UpdateStreamRequest(name="Renamed stream again")
    )
    update_event = await asyncio.wait_for(queue.get(), timeout=1)
    assert update_event.payload[0]["name"] == "Renamed stream again"

    await manager._broadcast_streams()
    assert queue.empty()

    await manager._broadcast_streams(include_transcriptions=True)
    transcript_event = await asyncio.wait_for(queue.get(), timeout=1)
    assert transcript_event.payload[0]["transcriptions"] == []

    await manager._broadcast_streams(include_transcriptions=True)
    repeat_event = await asyncio.wait_for(queue.get(), timeout=1)
    assert repeat_event.payload[0]["transcriptions"] == []

    assert queue.empty()


@pytest.mark.asyncio
async def test_system_event_trigger_normalization(minimal_config, tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    manager = StreamManager(
        minimal_config, db, PassthroughTranscriber("noop"), worker_factory=DummyWorker
    )
    await manager.initialize()

    stream = await manager.add_stream(
        AddStreamRequest(url="http://example.com/system", name="System")
    )

    await manager._record_system_event(
        stream,
        TranscriptionEventType.RECORDING_STARTED,
        RECORDING_STARTED_MESSAGE,
        SystemEventTrigger.manual("\n  triggered by Maintenance  \n"),
    )
    await manager._record_system_event(
        stream,
        TranscriptionEventType.RECORDING_STOPPED,
        RECORDING_STOPPED_MESSAGE,
        SystemEventTrigger.manual("   "),
    )
    await manager._record_system_event(
        stream,
        TranscriptionEventType.RECORDING_STARTED,
        RECORDING_STARTED_MESSAGE,
        SystemEventTrigger.manual(None),
    )

    events = await manager.database.load_recent_transcriptions(stream.id, limit=3)
    assert [event.eventType for event in events] == [
        TranscriptionEventType.RECORDING_STARTED,
        TranscriptionEventType.RECORDING_STOPPED,
        TranscriptionEventType.RECORDING_STARTED,
    ]
    assert events[0].text.endswith("(triggered by an unspecified reason)")
    assert events[1].text.endswith("(triggered by an unspecified reason)")
    assert events[2].text.endswith("(triggered by Maintenance)")


@pytest.mark.asyncio
async def test_system_event_timestamps_are_monotonic(
    minimal_config, tmp_path, monkeypatch
):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    manager = StreamManager(
        minimal_config, db, PassthroughTranscriber("noop"), worker_factory=DummyWorker
    )
    await manager.initialize()

    stream = await manager.add_stream(
        AddStreamRequest(url="http://example.com/system", name="System")
    )

    fixed_time = datetime(2024, 1, 1, 12, 0, tzinfo=timezone.utc)
    monkeypatch.setattr(
        "wavecap_backend.stream_manager.utcnow", lambda: fixed_time
    )

    await manager._record_system_event(
        stream,
        TranscriptionEventType.RECORDING_STARTED,
        RECORDING_STARTED_MESSAGE,
        SystemEventTrigger.manual("first"),
    )
    await manager._record_system_event(
        stream,
        TranscriptionEventType.RECORDING_STOPPED,
        RECORDING_STOPPED_MESSAGE,
        SystemEventTrigger.manual("second"),
    )

    events = await manager.database.load_recent_transcriptions(stream.id, limit=2)
    assert [event.eventType for event in events] == [
        TranscriptionEventType.RECORDING_STOPPED,
        TranscriptionEventType.RECORDING_STARTED,
    ]
    stop_event, start_event = events
    assert stop_event.timestamp > start_event.timestamp
    assert stop_event.timestamp - start_event.timestamp == timedelta(microseconds=1)


@pytest.mark.asyncio
async def test_duplicate_system_events_are_ignored(minimal_config, tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    manager = StreamManager(
        minimal_config, db, PassthroughTranscriber("noop"), worker_factory=DummyWorker
    )
    await manager.initialize()

    stream = await manager.add_stream(
        AddStreamRequest(url="http://example.com/system", name="System")
    )

    await manager._record_system_event(
        stream,
        TranscriptionEventType.RECORDING_STARTED,
        RECORDING_STARTED_MESSAGE,
        SystemEventTrigger.user_request(),
    )
    await manager._record_system_event(
        stream,
        TranscriptionEventType.RECORDING_STARTED,
        RECORDING_STARTED_MESSAGE,
        SystemEventTrigger.user_request(),
    )
    await manager._record_system_event(
        stream,
        TranscriptionEventType.RECORDING_STOPPED,
        RECORDING_STOPPED_MESSAGE,
        SystemEventTrigger.source_stream_ended(),
    )
    await manager._record_system_event(
        stream,
        TranscriptionEventType.RECORDING_STOPPED,
        RECORDING_STOPPED_MESSAGE,
        SystemEventTrigger.source_stream_ended(),
    )

    events = await manager.database.load_recent_transcriptions(stream.id, limit=4)
    assert len(events) == 2
    assert [event.eventType for event in events] == [
        TranscriptionEventType.RECORDING_STOPPED,
        TranscriptionEventType.RECORDING_STARTED,
    ]
    assert events[0].text.endswith("(triggered by source stream ended)")
    assert events[1].text.endswith("(triggered by user request)")

    await manager._record_system_event(
        stream,
        TranscriptionEventType.RECORDING_STARTED,
        RECORDING_STARTED_MESSAGE,
        SystemEventTrigger.user_request(),
    )

    latest = await manager.database.load_recent_transcriptions(stream.id, limit=3)
    assert [event.eventType for event in latest] == [
        TranscriptionEventType.RECORDING_STARTED,
        TranscriptionEventType.RECORDING_STOPPED,
        TranscriptionEventType.RECORDING_STARTED,
    ]


@pytest.mark.asyncio
async def test_enabled_stream_restarts_after_unexpected_stop(minimal_config, tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    manager = StreamManager(
        minimal_config, db, PassthroughTranscriber("test"), worker_factory=DummyWorker
    )
    await manager.initialize()

    stream = await manager.add_stream(
        AddStreamRequest(url="http://example.com/audio", name="Example")
    )
    await manager.start_stream(stream.id)
    await asyncio.sleep(0)

    original_worker = manager.workers.get(stream.id)
    assert original_worker is not None

    await manager._handle_status_change(
        manager.streams[stream.id], StreamStatus.STOPPED
    )
    await asyncio.sleep(0)

    restarted_worker = manager.workers.get(stream.id)
    assert restarted_worker is not None
    assert restarted_worker is not original_worker
    assert restarted_worker.started is True
    assert manager.streams[stream.id].enabled is True
    assert manager.streams[stream.id].status == StreamStatus.TRANSCRIBING


@pytest.mark.asyncio
async def test_add_stream_applies_broadcastify_preroll(minimal_config, tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    manager = StreamManager(
        minimal_config,
        db,
        PassthroughTranscriber("noop"),
        worker_factory=DummyWorker,
    )
    await manager.initialize()

    stream = await manager.add_stream(
        AddStreamRequest(
            url="https://broadcastify.cdnstream1.com/12345", name="Scanner"
        )
    )

    assert stream.ignoreFirstSeconds == pytest.approx(BROADCASTIFY_PREROLL_SECONDS)
    stored = await db.load_streams()
    assert stored and stored[0].ignoreFirstSeconds == pytest.approx(
        BROADCASTIFY_PREROLL_SECONDS
    )


@pytest.mark.asyncio
async def test_initialize_updates_broadcastify_streams(minimal_config, tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")

    broadcastify_stream = Stream(
        id="broadcastify",  # noqa: S105 - predictable ID used for testing only
        name="Scanner",
        url="https://www.broadcastify.com/listen/feed/123",
        status=StreamStatus.TRANSCRIBING,
        enabled=True,
        createdAt=utcnow(),
        transcriptions=[],
        source=StreamSource.AUDIO,
        ignoreFirstSeconds=0.0,
    )
    await db.save_stream(broadcastify_stream)

    manager = StreamManager(
        minimal_config,
        db,
        PassthroughTranscriber("noop"),
        worker_factory=DummyWorker,
    )
    await manager.initialize()

    streams = manager.get_streams()
    assert streams[0].ignoreFirstSeconds == pytest.approx(BROADCASTIFY_PREROLL_SECONDS)
    persisted = await db.load_streams()
    assert persisted[0].ignoreFirstSeconds == pytest.approx(
        BROADCASTIFY_PREROLL_SECONDS
    )


@pytest.mark.asyncio
async def test_initialize_skips_disabled_default_streams(minimal_config, tmp_path):
    config = minimal_config.model_copy(deep=True)
    config.defaultStreams = [
        StreamConfig(
            id="disabled-default",
            name="Disabled",
            url="http://example.com/disabled",
            enabled=False,
        )
    ]

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    manager = StreamManager(
        config,
        db,
        PassthroughTranscriber("noop"),
        worker_factory=DummyWorker,
    )

    await manager.initialize()

    assert manager.get_streams() == []
    assert await db.load_streams() == []


@pytest.mark.asyncio
async def test_audio_streams_ignore_concurrency_cap(minimal_config, tmp_path):
    minimal_config.whisper.maxConcurrentProcesses = 1
    db = StreamDatabase(tmp_path / "runtime.sqlite")

    started_ids: list[str] = []

    class RecordingWorker(DummyWorker):
        def start(self) -> None:
            started_ids.append(self.stream.id)
            super().start()

    manager = StreamManager(
        minimal_config,
        db,
        PassthroughTranscriber("noop"),
        worker_factory=RecordingWorker,
    )
    await manager.initialize()

    first = await manager.add_stream(
        AddStreamRequest(url="http://example.com/one", name="One")
    )
    second = await manager.add_stream(
        AddStreamRequest(url="http://example.com/two", name="Two")
    )

    await manager.start_stream(first.id)
    await manager.start_stream(second.id)
    await asyncio.sleep(0)

    assert set(started_ids) == {first.id, second.id}
    statuses = {stream.id: stream.status for stream in manager.get_streams()}
    assert statuses[first.id] == StreamStatus.TRANSCRIBING
    assert statuses[second.id] == StreamStatus.TRANSCRIBING


@pytest.mark.asyncio
async def test_pager_stream_webhook_flow(minimal_config, tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    manager = StreamManager(
        minimal_config, db, PassthroughTranscriber("noop"), worker_factory=DummyWorker
    )
    await manager.initialize()

    stream = await manager.add_stream(
        AddStreamRequest(name="Pager", source=StreamSource.PAGER)
    )

    assert stream.source == StreamSource.PAGER
    assert stream.webhookToken
    assert stream.status == StreamStatus.TRANSCRIBING
    assert stream.language is None

    result = await manager.ingest_pager_message(
        stream.id,
        PagerWebhookRequest(
            message="Structure fire reported",
            sender="Dispatch",
            details=["Units responding", "Cross streets pending"],
        ),
    )

    assert "Dispatch" in result.text
    assert "Structure fire reported" in result.text
    stored = await manager.database.load_recent_transcriptions(stream.id)
    assert stored and stored[0].text == result.text


@pytest.mark.asyncio
async def test_pager_stream_structured_metadata(minimal_config, tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    manager = StreamManager(
        minimal_config, db, PassthroughTranscriber("noop"), worker_factory=DummyWorker
    )
    await manager.initialize()

    stream = await manager.add_stream(
        AddStreamRequest(name="Pager", source=StreamSource.PAGER)
    )

    request = PagerWebhookRequest(
        message="INC1042 – TEST CALL",
        incident=PagerIncidentDetails(
            incidentId="INC1042",
            callType="TEST CALL",
            address="123 Example St",
            alarmLevel="2",
        ),
        details=["Units: TST1"],
    )

    result = await manager.ingest_pager_message(stream.id, request)

    assert result.pagerIncident is not None
    assert result.pagerIncident.incidentId == "INC1042"
    assert result.pagerIncident.callType == "TEST CALL"

    stored = await manager.database.load_recent_transcriptions(stream.id)
    assert stored
    assert stored[0].pagerIncident is not None
    assert stored[0].pagerIncident.address == "123 Example St"


@pytest.mark.asyncio
async def test_update_review(minimal_config, tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    manager = StreamManager(
        minimal_config, db, PassthroughTranscriber("hello"), worker_factory=DummyWorker
    )
    await manager.initialize()
    stream = await manager.add_stream(
        AddStreamRequest(url="http://example.com/test", name="Test")
    )

    # Insert transcription directly
    result = TranscriptionResult(
        id=str(uuid.uuid4()),
        streamId=stream.id,
        text="Sample text",
        timestamp=utcnow(),
    )
    await manager.database.append_transcription(result)

    updated = await manager.update_review(
        result.id, "Corrected", TranscriptionReviewStatus.CORRECTED, "Tester"
    )
    assert updated.correctedText == "Corrected"
    assert updated.reviewStatus == TranscriptionReviewStatus.CORRECTED
    assert updated.reviewedBy == "Tester"


@pytest.mark.asyncio
async def test_broadcaster_publish_and_unregister():
    broadcaster = StreamEventBroadcaster()
    queue_a = await broadcaster.register()
    queue_b = await broadcaster.register()

    first_event = StreamEvent("streams_update", {"streams": []})
    await broadcaster.publish(first_event)

    received_a = await asyncio.wait_for(queue_a.get(), timeout=1)
    received_b = await asyncio.wait_for(queue_b.get(), timeout=1)
    assert received_a is first_event
    assert received_b is first_event

    await broadcaster.unregister(queue_a)

    second_event = StreamEvent("transcription", {})
    await broadcaster.publish(second_event)

    received_b_again = await asyncio.wait_for(queue_b.get(), timeout=1)
    assert received_b_again is second_event

    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(queue_a.get(), timeout=0.1)


@pytest.mark.asyncio
async def test_broadcaster_drops_events_for_slow_subscribers():
    broadcaster = StreamEventBroadcaster(max_queue_size=1)
    queue = await broadcaster.register()

    await asyncio.wait_for(
        broadcaster.publish(StreamEvent("first", {})), timeout=0.1
    )
    await asyncio.wait_for(
        broadcaster.publish(StreamEvent("second", {})), timeout=0.1
    )

    latest = await asyncio.wait_for(queue.get(), timeout=1)
    assert latest.type == "second"
    assert queue.empty()


@pytest.mark.asyncio
async def test_initialize_loads_existing_streams_and_broadcasts(
    minimal_config, tmp_path
):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    stream = Stream(
        id="stream-1",
        name="Loaded",
        url="http://example.com/loaded",
        status=StreamStatus.STOPPED,
        createdAt=utcnow(),
        transcriptions=[],
    )
    await db.save_stream(stream)
    transcription = TranscriptionResult(
        id=str(uuid.uuid4()),
        streamId=stream.id,
        text="hello world",
        timestamp=utcnow(),
    )
    await db.append_transcription(transcription)

    manager = StreamManager(
        minimal_config, db, PassthroughTranscriber("noop"), worker_factory=DummyWorker
    )
    queue = await manager.broadcaster.register()
    await manager.initialize()

    loaded = manager.get_streams()
    assert len(loaded) == 1
    assert loaded[0].id == stream.id
    assert [t.id for t in loaded[0].transcriptions] == [transcription.id]

    broadcast_event = await asyncio.wait_for(queue.get(), timeout=1)
    assert broadcast_event.type == "streams_update"
    assert broadcast_event.payload[0]["id"] == stream.id


@pytest.mark.asyncio
async def test_initialize_restarts_transcribing_audio_streams(minimal_config, tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    stream = Stream(
        id="stream-1",
        name="Restart me",
        url="http://example.com/restart",
        status=StreamStatus.TRANSCRIBING,
        enabled=True,
        createdAt=utcnow(),
        transcriptions=[],
    )
    await db.save_stream(stream)

    started_ids: list[str] = []

    class TrackingWorker(DummyWorker):
        def __init__(self, stream, **kwargs):
            super().__init__(stream, **kwargs)

        def start(self) -> None:
            super().start()
            started_ids.append(self.stream.id)

    manager = StreamManager(
        minimal_config,
        db,
        PassthroughTranscriber("noop"),
        worker_factory=TrackingWorker,
    )

    await manager.initialize()
    await asyncio.sleep(0)

    assert started_ids == [stream.id]
    assert stream.id in manager.workers
    assert manager.workers[stream.id].started is True
    assert manager.streams[stream.id].status == StreamStatus.TRANSCRIBING


@pytest.mark.asyncio
async def test_initialize_broadcasts_transcribing_status(minimal_config, tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    stream = Stream(
        id="stream-1",
        name="Restart me",
        url="http://example.com/restart",
        status=StreamStatus.TRANSCRIBING,
        enabled=True,
        createdAt=utcnow(),
        transcriptions=[],
    )
    await db.save_stream(stream)

    manager = StreamManager(
        minimal_config,
        db,
        PassthroughTranscriber("noop"),
        worker_factory=DummyWorker,
    )

    queue = await manager.broadcaster.register()

    await manager.initialize()

    event = await asyncio.wait_for(queue.get(), timeout=1)
    assert event.type == "streams_update"
    assert event.payload[0]["status"] == StreamStatus.TRANSCRIBING


@pytest.mark.asyncio
async def test_add_stream_validates_unique_ids(minimal_config, tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    manager = StreamManager(
        minimal_config, db, PassthroughTranscriber("noop"), worker_factory=DummyWorker
    )
    await manager.initialize()

    request = AddStreamRequest(url="http://example.com/one", name="One", id="duplicate")
    await manager.add_stream(request)

    with pytest.raises(ValueError):
        await manager.add_stream(
            AddStreamRequest(url="http://example.com/two", name="Two", id="duplicate")
        )


@pytest.mark.asyncio
async def test_reset_stream_removes_recordings(minimal_config, tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    manager = StreamManager(
        minimal_config, db, PassthroughTranscriber("noop"), worker_factory=DummyWorker
    )
    await manager.initialize()
    stream = await manager.add_stream(
        AddStreamRequest(url="http://example.com/reset", name="Reset")
    )

    transcription = TranscriptionResult(
        id=str(uuid.uuid4()),
        streamId=stream.id,
        text="before reset",
        timestamp=utcnow(),
    )
    await manager.database.append_transcription(transcription)

    from wavecap_backend import state_paths

    state_paths.RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
    recording_path = state_paths.RECORDINGS_DIR / f"stream-{stream.id}-segment.wav"
    recording_path.write_bytes(b"audio data")

    await manager.reset_stream(stream.id)

    assert not recording_path.exists()
    transcriptions, has_more = await manager.database.query_transcriptions(
        stream.id
    )
    assert transcriptions == []
    assert has_more is False
    assert manager.get_streams()[0].transcriptions == []


@pytest.mark.asyncio
async def test_transcription_updates_activity_without_resaving_stream(
    minimal_config, tmp_path, monkeypatch
):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    stream = Stream(
        id="activity-stream",
        name="Activity",
        url="http://example.com/activity",
        status=StreamStatus.STOPPED,
        createdAt=utcnow(),
        transcriptions=[],
    )
    await db.save_stream(stream)

    manager = StreamManager(
        minimal_config,
        db,
        PassthroughTranscriber("noop"),
        worker_factory=DummyWorker,
    )
    await manager.initialize()

    queue = await manager.broadcaster.register()

    def fail_save_stream(_: Stream) -> None:  # pragma: no cover - enforced via test
        raise AssertionError(
            "save_stream should not be called when handling transcriptions"
        )

    monkeypatch.setattr(manager.database, "save_stream", fail_save_stream, raising=True)

    transcription = TranscriptionResult(
        id=str(uuid.uuid4()),
        streamId=stream.id,
        text="hello world",
        timestamp=utcnow(),
    )
    await manager.database.append_transcription(transcription)

    await manager._handle_transcription(transcription)

    event = await asyncio.wait_for(queue.get(), timeout=1)
    assert event.type == "transcription"
    assert event.payload["id"] == transcription.id

    reloaded = (await db.load_streams())[0]
    assert reloaded.lastActivityAt == transcription.timestamp
    assert manager.streams[stream.id].lastActivityAt == transcription.timestamp


class TrackingWorker(DummyWorker):
    def __init__(self, stream, **kwargs):
        super().__init__(stream, **kwargs)
        self.stop_calls = 0

    async def stop(self) -> None:
        self.stop_calls += 1
        await super().stop()


class SilentShutdownWorker(DummyWorker):
    async def stop(self) -> None:
        self.started = False


class ErrorWorker(DummyWorker):
    def start(self) -> None:
        super().start()
        if not self._on_status_change:
            return

        async def fail_later() -> None:
            await asyncio.sleep(0)
            self.stream.error = "Simulated failure"
            await self._on_status_change(self.stream, StreamStatus.ERROR)

        loop = asyncio.get_running_loop()
        loop.create_task(fail_later())


@pytest.mark.asyncio
async def test_shutdown_stops_all_workers(minimal_config, tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    created_workers: list[TrackingWorker] = []

    def factory(**kwargs):
        worker = TrackingWorker(**kwargs)
        created_workers.append(worker)
        return worker

    manager = StreamManager(
        minimal_config, db, PassthroughTranscriber("noop"), worker_factory=factory
    )
    await manager.initialize()
    stream = await manager.add_stream(
        AddStreamRequest(url="http://example.com/live", name="Live")
    )
    await manager.start_stream(stream.id)

    assert created_workers

    await manager.shutdown()

    assert all(worker.stop_calls == 1 for worker in created_workers)
    assert manager.workers == {}
    assert manager.streams[stream.id].status == StreamStatus.TRANSCRIBING
    reloaded = await db.load_streams()
    assert reloaded[0].status == StreamStatus.TRANSCRIBING


@pytest.mark.asyncio
async def test_shutdown_records_stop_event_when_worker_silent(
    minimal_config, tmp_path
):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    manager = StreamManager(
        minimal_config,
        db,
        PassthroughTranscriber("noop"),
        worker_factory=SilentShutdownWorker,
    )

    await manager.initialize()
    stream = await manager.add_stream(
        AddStreamRequest(url="http://example.com/live", name="Live")
    )

    await manager.start_stream(stream.id)
    await asyncio.sleep(0)

    for _ in range(10):
        start_events = await manager.database.load_recent_transcriptions(
            stream.id, limit=1
        )
        if start_events and start_events[0].eventType == TranscriptionEventType.RECORDING_STARTED:
            break
        await asyncio.sleep(0.01)
    else:  # pragma: no cover - defensive timeout in tests
        pytest.fail("Timed out waiting for stream start event")

    await manager.shutdown()

    events = await manager.database.load_recent_transcriptions(stream.id, limit=2)
    assert [event.eventType for event in events] == [
        TranscriptionEventType.RECORDING_STOPPED,
        TranscriptionEventType.RECORDING_STARTED,
    ]
    assert (
        events[0].text
        == "Recording and transcription stopped (triggered by service shutdown)"
    )

    persisted = await db.load_streams()
    assert persisted[0].status == StreamStatus.TRANSCRIBING


@pytest.mark.asyncio
async def test_shutdown_recovers_from_stop_event_failure(
    minimal_config, tmp_path, monkeypatch
):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    manager = StreamManager(
        minimal_config,
        db,
        PassthroughTranscriber("noop"),
        worker_factory=DummyWorker,
    )

    await manager.initialize()
    stream = await manager.add_stream(
        AddStreamRequest(url="http://example.com/live", name="Live")
    )

    await manager.start_stream(stream.id)
    await asyncio.sleep(0)

    for _ in range(10):
        start_events = await manager.database.load_recent_transcriptions(
            stream.id, limit=1
        )
        if (
            start_events
            and start_events[0].eventType
            == TranscriptionEventType.RECORDING_STARTED
        ):
            break
        await asyncio.sleep(0.01)
    else:  # pragma: no cover - defensive timeout
        pytest.fail("Timed out waiting for stream start event")

    original_event_logger = manager._record_system_event
    call_count = 0

    async def flaky_record_event(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise RuntimeError("simulated failure")
        return await original_event_logger(*args, **kwargs)

    monkeypatch.setattr(
        manager,
        "_record_system_event",
        flaky_record_event,
        raising=False,
    )

    await manager.shutdown()

    events = await manager.database.load_recent_transcriptions(stream.id, limit=2)
    assert [event.eventType for event in events] == [
        TranscriptionEventType.RECORDING_STOPPED,
        TranscriptionEventType.RECORDING_STARTED,
    ]
    assert (
        events[0].text
        == "Recording and transcription stopped (triggered by service shutdown)"
    )
    assert call_count == 2


@pytest.mark.asyncio
async def test_error_stop_event_records_trigger(minimal_config, tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    manager = StreamManager(
        minimal_config,
        db,
        PassthroughTranscriber("noop"),
        worker_factory=ErrorWorker,
    )

    await manager.initialize()
    stream = await manager.add_stream(
        AddStreamRequest(url="http://example.com/failing", name="Failing")
    )

    await manager.start_stream(stream.id)
    for _ in range(10):
        events = await manager.database.load_recent_transcriptions(stream.id, limit=2)
        if len(events) >= 2:
            break
        await asyncio.sleep(0.01)
    else:  # pragma: no cover - defensive timeout
        pytest.fail("Timed out waiting for error stop event")

    assert [event.eventType for event in events] == [
        TranscriptionEventType.RECORDING_STOPPED,
        TranscriptionEventType.RECORDING_STARTED,
    ]
    assert (
        events[0].text
        == "Recording and transcription stopped (triggered by stream error: Simulated failure)"
    )
    assert (
        events[1].text
        == "Recording and transcription started (triggered by user request)"
    )


@pytest.mark.asyncio
async def test_shutdown_marks_streams_for_restart(minimal_config, tmp_path):
    db_path = tmp_path / "runtime.sqlite"
    db = StreamDatabase(db_path)

    manager = StreamManager(
        minimal_config,
        db,
        PassthroughTranscriber("noop"),
        worker_factory=TrackingWorker,
    )
    await manager.initialize()
    stream = await manager.add_stream(
        AddStreamRequest(url="http://example.com/live", name="Live")
    )
    await manager.start_stream(stream.id)
    await asyncio.sleep(0)

    await manager.shutdown()
    await db.close()

    resumed_ids: list[str] = []

    class RestartTrackingWorker(DummyWorker):
        def __init__(self, stream, **kwargs):
            super().__init__(stream, **kwargs)

        def start(self) -> None:
            resumed_ids.append(self.stream.id)
            super().start()

    reloaded_db = StreamDatabase(db_path)
    new_manager = StreamManager(
        minimal_config,
        reloaded_db,
        PassthroughTranscriber("noop"),
        worker_factory=RestartTrackingWorker,
    )
    await new_manager.initialize()
    await asyncio.sleep(0)

    assert resumed_ids == [stream.id]

    events = await new_manager.database.load_recent_transcriptions(stream.id, limit=3)
    assert [event.eventType for event in events] == [
        TranscriptionEventType.RECORDING_STARTED,
        TranscriptionEventType.RECORDING_STOPPED,
        TranscriptionEventType.RECORDING_STARTED,
    ]
    assert (
        events[0].text
        == "Recording and transcription started (triggered by automatic resume after restart)"
    )
    assert (
        events[1].text
        == "Recording and transcription stopped (triggered by service shutdown)"
    )

    await new_manager.shutdown()
    await reloaded_db.close()


@pytest.mark.asyncio
async def test_upstream_connectivity_events_record_messages(minimal_config, tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    manager = StreamManager(
        minimal_config, db, PassthroughTranscriber("noop"), worker_factory=DummyWorker
    )
    await manager.initialize()

    stream = await manager.add_stream(
        AddStreamRequest(url="http://example.com/upstream", name="Upstream")
    )

    await manager._handle_upstream_disconnect(stream, attempt=2, delay_seconds=600)
    await manager._handle_upstream_reconnect(stream, attempt=2)

    events = await manager.database.load_recent_transcriptions(stream.id, limit=2)
    assert [event.eventType for event in events] == [
        TranscriptionEventType.UPSTREAM_RECONNECTED,
        TranscriptionEventType.UPSTREAM_DISCONNECTED,
    ]
    reconnect_event, disconnect_event = events
    assert reconnect_event.text.startswith(UPSTREAM_RECONNECTED_MESSAGE)
    assert "after 2 attempts" in reconnect_event.text
    assert disconnect_event.text.startswith(UPSTREAM_DISCONNECTED_MESSAGE)
    assert "retrying in 10 minutes" in disconnect_event.text
    assert "(attempt 2)" in disconnect_event.text


@pytest.mark.asyncio
async def test_query_transcriptions_returns_database_results(minimal_config, tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    manager = StreamManager(
        minimal_config, db, PassthroughTranscriber("noop"), worker_factory=DummyWorker
    )
    await manager.initialize()
    stream = await manager.add_stream(
        AddStreamRequest(url="http://example.com/query", name="Query")
    )

    transcription = TranscriptionResult(
        id=str(uuid.uuid4()),
        streamId=stream.id,
        text="latest",
        timestamp=utcnow(),
    )
    await manager.database.append_transcription(transcription)

    response = await manager.query_transcriptions(stream.id, limit=10)
    assert [result.id for result in response.transcriptions] == [transcription.id]
    assert response.hasMoreAfter is False
    assert response.hasMoreBefore is False
