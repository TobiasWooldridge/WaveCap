from datetime import datetime, timedelta
import uuid

import pytest

from wavecap_backend.database import StreamDatabase
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
async def test_ignore_first_seconds_persistence(tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    stream = _make_stream()
    stream.ignoreFirstSeconds = 12.5
    await db.save_stream(stream)

    loaded = await db.load_streams()
    assert loaded[0].ignoreFirstSeconds == 12.5

    await db.close()


@pytest.mark.asyncio
async def test_stream_enabled_round_trips(tmp_path):
    db = StreamDatabase(tmp_path / "runtime.sqlite")
    stream = _make_stream(enabled=True)
    await db.save_stream(stream)

    loaded = await db.load_streams()
    assert loaded[0].enabled is True

    stream.enabled = False
    await db.save_stream(stream)

    reloaded = await db.load_streams()
    assert reloaded[0].enabled is False

    await db.close()
