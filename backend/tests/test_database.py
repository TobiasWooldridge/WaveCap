from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch
import uuid

import pytest

from wavecap_backend.database import (
    StreamDatabase,
    DB_RETRY_MAX_ATTEMPTS,
    DB_RETRY_BASE_DELAY,
)
from wavecap_backend.datetime_utils import utcnow
from wavecap_backend.models import (
    Stream,
    StreamSource,
    StreamStatus,
    TranscriptionResult,
    TranscriptionReviewStatus,
)


def _make_stream(
    stream_id: str = "stream-1",
    *,
    enabled: bool = False,
    source: StreamSource = StreamSource.AUDIO,
) -> Stream:
    return Stream(
        id=stream_id,
        name="Stream",
        url="http://example.com",
        status=StreamStatus.STOPPED,
        enabled=enabled,
        createdAt=utcnow(),
        transcriptions=[],
        ignoreFirstSeconds=0.0,
        source=source,
    )


def _make_transcription(
    stream_id: str, timestamp: datetime, suffix: str = ""
) -> TranscriptionResult:
    return TranscriptionResult(
        id=str(uuid.uuid4()),
        streamId=stream_id,
        text=f"transcription{suffix}",
        timestamp=timestamp,
    )


@pytest.mark.asyncio
async def test_query_transcriptions_filters_by_time(tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    stream = _make_stream()
    await db.save_stream(stream)

    base_time = utcnow()
    newest = _make_transcription(stream.id, base_time, "-new")
    mid = _make_transcription(stream.id, base_time - timedelta(seconds=5), "-mid")
    oldest = _make_transcription(stream.id, base_time - timedelta(seconds=10), "-old")

    for result in (newest, mid, oldest):
        await db.append_transcription(result)

    ordered, has_more = await db.query_transcriptions(stream.id, limit=10)
    assert has_more is False
    assert [item.id for item in ordered] == [newest.id, mid.id, oldest.id]

    limited, limited_has_more = await db.query_transcriptions(stream.id, limit=2)
    assert limited_has_more is True
    assert [item.id for item in limited] == [newest.id, mid.id]

    await db.close()


@pytest.mark.asyncio
async def test_query_transcriptions_search_filters_text_and_corrected(tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    stream = _make_stream()
    await db.save_stream(stream)

    base_time = utcnow()
    horse_hit = _make_transcription(stream.id, base_time)
    horse_hit.text = "Spotted a horse near the trail"

    corrected_hit = _make_transcription(stream.id, base_time - timedelta(seconds=5))
    corrected_hit.text = "Initial text"
    corrected_hit.correctedText = "Mounted patrol on horseback"

    non_match = _make_transcription(stream.id, base_time - timedelta(seconds=10))
    non_match.text = "Nothing to see here"

    for result in (horse_hit, corrected_hit, non_match):
        await db.append_transcription(result)

    # Default order returns newest first
    results_desc, has_more_desc = await db.query_transcriptions(
        stream.id, limit=10, search="horse"
    )
    assert has_more_desc is False
    assert [item.id for item in results_desc] == [horse_hit.id, corrected_hit.id]

    # Ascending order returns oldest first
    results_asc, has_more_asc = await db.query_transcriptions(
        stream.id, limit=10, search="horse", order="asc"
    )
    assert has_more_asc is False
    assert [item.id for item in results_asc] == [corrected_hit.id, horse_hit.id]

    await db.close()


@pytest.mark.asyncio
async def test_update_review_and_export(tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    stream = _make_stream()
    await db.save_stream(stream)

    first = _make_transcription(stream.id, utcnow(), "-first")
    second = _make_transcription(stream.id, utcnow() + timedelta(seconds=1), "-second")
    await db.append_transcription(first)
    await db.append_transcription(second)

    updated = await db.update_review(
        first.id, "Corrected", TranscriptionReviewStatus.CORRECTED, "Reviewer"
    )
    assert updated.correctedText == "Corrected"
    assert updated.reviewStatus == TranscriptionReviewStatus.CORRECTED
    assert updated.reviewedBy == "Reviewer"
    assert updated.reviewedAt is not None

    with pytest.raises(KeyError):
        await db.update_review(
            "missing", "", TranscriptionReviewStatus.CORRECTED, "Reviewer"
        )

    all_results = await db.export_transcriptions()
    assert [item.id for item in all_results] == [first.id, second.id]

    corrected_only = await db.export_transcriptions([TranscriptionReviewStatus.CORRECTED])
    assert [item.id for item in corrected_only] == [first.id]

    await db.close()


@pytest.mark.asyncio
async def test_export_pager_messages_requires_pager_stream(tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    pager_stream = _make_stream("pager-1", source=StreamSource.PAGER)
    audio_stream = _make_stream("audio-1")
    await db.save_stream(pager_stream)
    await db.save_stream(audio_stream)

    base_time = utcnow()
    pager_first = _make_transcription(
        pager_stream.id, base_time - timedelta(seconds=5), "-first"
    )
    pager_second = _make_transcription(pager_stream.id, base_time, "-second")
    audio_result = _make_transcription(audio_stream.id, base_time, "-other")

    for result in (pager_first, pager_second, audio_result):
        await db.append_transcription(result)

    results = await db.export_pager_messages(pager_stream.id)
    assert [item.id for item in results] == [pager_first.id, pager_second.id]

    await db.close()


@pytest.mark.asyncio
async def test_config_fields_set_on_initial_save_only(tmp_path):
    """Config fields (ignoreFirstSeconds, enabled, etc.) are set on initial
    save but not updated afterward - they come from config.yaml at startup."""
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    stream = _make_stream(enabled=True)
    stream.ignoreFirstSeconds = 12.5
    await db.save_stream(stream)

    # Initial save sets config fields
    loaded = await db.load_streams()
    assert loaded[0].ignoreFirstSeconds == 12.5
    assert loaded[0].enabled is True

    # Subsequent saves do NOT update config fields
    stream.ignoreFirstSeconds = 99.0
    stream.enabled = False
    await db.save_stream(stream)

    reloaded = await db.load_streams()
    # Values remain from initial save, not updated
    assert reloaded[0].ignoreFirstSeconds == 12.5
    assert reloaded[0].enabled is True

    await db.close()


@pytest.mark.asyncio
async def test_runtime_state_persists_on_save(tmp_path):
    """Runtime state (status, error, timestamps) is always persisted."""
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    stream = _make_stream()
    stream.error = None
    await db.save_stream(stream)

    loaded = await db.load_streams()
    assert loaded[0].error is None

    # Update runtime state
    stream.error = "Connection failed"
    await db.save_stream(stream)

    reloaded = await db.load_streams()
    assert reloaded[0].error == "Connection failed"

    await db.close()


@pytest.mark.asyncio
async def test_commit_with_retry_retries_on_database_locked(tmp_path):
    """Verify that _commit_with_retry retries on 'database is locked' errors."""
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    await db.initialize()

    commit_attempts = []

    class MockSession:
        async def commit(self):
            commit_attempts.append(1)
            if len(commit_attempts) < DB_RETRY_MAX_ATTEMPTS:
                raise Exception("database is locked")
            # Succeed on final attempt

    mock_session = MockSession()

    # Patch asyncio.sleep to speed up the test
    with patch("wavecap_backend.database.asyncio.sleep", new_callable=AsyncMock):
        await db._commit_with_retry(mock_session)

    assert len(commit_attempts) == DB_RETRY_MAX_ATTEMPTS
    await db.close()


@pytest.mark.asyncio
async def test_commit_with_retry_raises_after_max_attempts(tmp_path):
    """Verify that _commit_with_retry raises after exhausting all retry attempts."""
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    await db.initialize()

    commit_attempts = []

    class MockSession:
        async def commit(self):
            commit_attempts.append(1)
            raise Exception("database is locked")

    mock_session = MockSession()

    with patch("wavecap_backend.database.asyncio.sleep", new_callable=AsyncMock):
        with pytest.raises(Exception, match="database is locked"):
            await db._commit_with_retry(mock_session)

    assert len(commit_attempts) == DB_RETRY_MAX_ATTEMPTS
    await db.close()


@pytest.mark.asyncio
async def test_commit_with_retry_no_retry_on_other_errors(tmp_path):
    """Verify that non-lock errors are raised immediately without retrying."""
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    await db.initialize()

    commit_attempts = []

    class MockSession:
        async def commit(self):
            commit_attempts.append(1)
            raise Exception("UNIQUE constraint failed")

    mock_session = MockSession()

    with pytest.raises(Exception, match="UNIQUE constraint failed"):
        await db._commit_with_retry(mock_session)

    # Should only attempt once - no retries for non-lock errors
    assert len(commit_attempts) == 1
    await db.close()


@pytest.mark.asyncio
async def test_commit_with_retry_succeeds_immediately(tmp_path):
    """Verify that successful commits don't retry."""
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    await db.initialize()

    commit_attempts = []

    class MockSession:
        async def commit(self):
            commit_attempts.append(1)

    mock_session = MockSession()
    await db._commit_with_retry(mock_session)

    assert len(commit_attempts) == 1
    await db.close()


@pytest.mark.asyncio
async def test_initialize_is_idempotent(tmp_path):
    """Calling initialize() multiple times should not raise."""
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    await db.initialize()
    await db.initialize()  # Should not raise
    await db.close()


@pytest.mark.asyncio
async def test_append_transcription_with_segments(tmp_path):
    """Transcription segments are persisted and loaded correctly."""
    from wavecap_backend.models import TranscriptionSegment

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    stream = _make_stream()
    await db.save_stream(stream)

    tx = _make_transcription(stream.id, utcnow())
    tx.segments = [
        TranscriptionSegment(
            id=0, text="Hello", start=0.0, end=0.5, seek=0,
            no_speech_prob=0.1, temperature=0.0, avg_logprob=-0.5, compression_ratio=1.2,
        ),
        TranscriptionSegment(
            id=1, text="world", start=0.5, end=1.0, seek=0,
            no_speech_prob=0.1, temperature=0.0, avg_logprob=-0.5, compression_ratio=1.2,
        ),
    ]
    await db.append_transcription(tx)

    transcriptions = await db.load_recent_transcriptions(stream.id, limit=10)
    assert transcriptions[0].segments is not None
    assert len(transcriptions[0].segments) == 2
    assert transcriptions[0].segments[0].text == "Hello"
    assert transcriptions[0].segments[1].text == "world"

    await db.close()


@pytest.mark.asyncio
async def test_append_transcription_with_waveform(tmp_path):
    """Waveform data is persisted and loaded correctly."""
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    stream = _make_stream()
    await db.save_stream(stream)

    tx = _make_transcription(stream.id, utcnow())
    tx.waveform = [0.1, 0.5, 0.8, 0.3, 0.2]
    await db.append_transcription(tx)

    transcriptions = await db.load_recent_transcriptions(stream.id, limit=10)
    assert transcriptions[0].waveform == [0.1, 0.5, 0.8, 0.3, 0.2]

    await db.close()


@pytest.mark.asyncio
async def test_append_transcription_with_pager_incident(tmp_path):
    """Pager incident details are persisted and loaded correctly."""
    from wavecap_backend.models import PagerIncidentDetails

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    stream = _make_stream(source=StreamSource.PAGER)
    await db.save_stream(stream)

    tx = _make_transcription(stream.id, utcnow())
    tx.pagerIncident = PagerIncidentDetails(
        incidentId="INC001",
        callType="FIRE",
        address="123 Main St",
    )
    await db.append_transcription(tx)

    transcriptions = await db.load_recent_transcriptions(stream.id, limit=10)
    assert transcriptions[0].pagerIncident is not None
    assert transcriptions[0].pagerIncident.incidentId == "INC001"
    assert transcriptions[0].pagerIncident.callType == "FIRE"

    await db.close()


@pytest.mark.asyncio
async def test_load_last_system_event(tmp_path):
    """load_last_system_event returns the most recent non-transcription event."""
    from wavecap_backend.models import TranscriptionEventType

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    stream = _make_stream()
    await db.save_stream(stream)

    base_time = utcnow()

    tx1 = _make_transcription(stream.id, base_time, "-normal")
    tx1.eventType = TranscriptionEventType.TRANSCRIPTION

    tx2 = _make_transcription(stream.id, base_time + timedelta(seconds=1), "-started")
    tx2.eventType = TranscriptionEventType.RECORDING_STARTED

    tx3 = _make_transcription(stream.id, base_time + timedelta(seconds=2), "-another")
    tx3.eventType = TranscriptionEventType.TRANSCRIPTION

    for tx in (tx1, tx2, tx3):
        await db.append_transcription(tx)

    result = await db.load_last_system_event(stream.id)

    assert result is not None
    assert result.eventType == TranscriptionEventType.RECORDING_STARTED

    await db.close()


@pytest.mark.asyncio
async def test_load_last_system_event_returns_none_when_no_events(tmp_path):
    """load_last_system_event returns None when only transcription events exist."""
    from wavecap_backend.models import TranscriptionEventType

    db = StreamDatabase(tmp_path / "runtime.sqlite")
    stream = _make_stream()
    await db.save_stream(stream)

    tx = _make_transcription(stream.id, utcnow())
    tx.eventType = TranscriptionEventType.TRANSCRIPTION
    await db.append_transcription(tx)

    result = await db.load_last_system_event(stream.id)

    assert result is None

    await db.close()


@pytest.mark.asyncio
async def test_clear_all_removes_streams_and_transcriptions(tmp_path):
    """clear_all removes all persisted data."""
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    stream = _make_stream()
    await db.save_stream(stream)

    tx = _make_transcription(stream.id, utcnow())
    await db.append_transcription(tx)

    await db.clear_all()

    streams = await db.load_streams()
    assert len(streams) == 0

    transcriptions = await db.load_recent_transcriptions(stream.id, limit=10)
    assert len(transcriptions) == 0

    await db.close()


@pytest.mark.asyncio
async def test_delete_stream_removes_stream_and_transcriptions(tmp_path):
    """delete_stream removes both the stream and its transcriptions."""
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    stream = _make_stream()
    await db.save_stream(stream)

    tx = _make_transcription(stream.id, utcnow())
    await db.append_transcription(tx)

    await db.delete_stream(stream.id)

    streams = await db.load_streams()
    assert len(streams) == 0

    transcriptions = await db.load_recent_transcriptions(stream.id, limit=10)
    assert len(transcriptions) == 0

    await db.close()


@pytest.mark.asyncio
async def test_speech_boundary_offsets_persisted(tmp_path):
    """Speech start/end offsets are stored and retrieved."""
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    stream = _make_stream()
    await db.save_stream(stream)

    tx = _make_transcription(stream.id, utcnow())
    tx.speechStartOffset = 0.5
    tx.speechEndOffset = 2.3
    await db.append_transcription(tx)

    transcriptions = await db.load_recent_transcriptions(stream.id, limit=10)
    assert transcriptions[0].speechStartOffset == 0.5
    assert transcriptions[0].speechEndOffset == 2.3

    await db.close()
