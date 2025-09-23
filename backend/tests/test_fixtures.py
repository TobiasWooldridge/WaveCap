import pytest

from wavecap_backend.database import StreamDatabase
from wavecap_backend.fixtures import load_fixture_set
from wavecap_backend.models import StreamStatus, TranscriptionReviewStatus
from wavecap_backend.state_paths import resolve_state_path


@pytest.mark.asyncio
async def test_load_screenshot_fixtures_populates_database() -> None:
    database = StreamDatabase(resolve_state_path("runtime.sqlite"))
    try:
        await load_fixture_set("screenshot", database)

        streams = {stream.id: stream for stream in await database.load_streams()}
        assert set(streams) == {"adelaide-tower", "ses-operations", "ses-pager"}

        adelaide = streams["adelaide-tower"]
        assert adelaide.status == StreamStatus.TRANSCRIBING
        assert adelaide.enabled is True

        operations = streams["ses-operations"]
        assert operations.status == StreamStatus.ERROR
        assert "Link down" in (operations.error or "")
        assert operations.enabled is True

        pager = streams["ses-pager"]
        assert pager.webhookToken == "demo-ses-token-451"
        assert pager.enabled is True

        adelaide_transcriptions = await database.load_recent_transcriptions(
            "adelaide-tower"
        )
        assert any(
            t.reviewStatus == TranscriptionReviewStatus.CORRECTED
            for t in adelaide_transcriptions
        )
        assert any(
            t.reviewStatus == TranscriptionReviewStatus.VERIFIED
            for t in adelaide_transcriptions
        )
    finally:
        await database.close()


@pytest.mark.asyncio
async def test_fixture_set_aliases() -> None:
    database = StreamDatabase(resolve_state_path("runtime.sqlite"))
    try:
        await load_fixture_set("screenshots", database)
        streams = await database.load_streams()
        assert len(streams) == 3
    finally:
        await database.close()
