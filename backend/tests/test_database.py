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
