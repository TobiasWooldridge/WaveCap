"""Utility helpers for loading demo fixture data."""

from __future__ import annotations

import logging
import shutil
from datetime import timedelta
from pathlib import Path
from typing import Awaitable, Callable, Dict

from .database import StreamDatabase
from .datetime_utils import utcnow
from .models import (
    Stream,
    StreamSource,
    StreamStatus,
    TranscriptionAlertTrigger,
    TranscriptionEventType,
    TranscriptionResult,
    TranscriptionReviewStatus,
    TranscriptionSegment,
)
from .state_paths import RECORDINGS_DIR

LOGGER = logging.getLogger(__name__)


def _write_placeholder_recordings(paths: set[Path]) -> None:
    if RECORDINGS_DIR.exists():
        shutil.rmtree(RECORDINGS_DIR)
    for relative in paths:
        target = RECORDINGS_DIR / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        try:
            target.write_bytes(b"")
        except OSError:
            LOGGER.debug("Unable to create placeholder recording at %s", target)


async def load_screenshot_fixtures(database: StreamDatabase) -> None:
    """Populate the database with canned data for UI screenshots."""

    LOGGER.info("Loading screenshot fixtures; existing data will be replaced")
    await database.clear_all()

    now = utcnow().replace(microsecond=0)
    recordings: set[Path] = set()

    streams = [
        Stream(
            id="adelaide-tower",
            name="Adelaide Tower (Airband)",
            url="https://streams.example.net/airband/adelaide.mp3",
            status=StreamStatus.TRANSCRIBING,
            enabled=True,
            createdAt=now - timedelta(hours=2, minutes=5),
            language="en",
            transcriptions=[],
            source=StreamSource.AUDIO,
            ignoreFirstSeconds=5.0,
        ),
        Stream(
            id="ses-operations",
            name="SA SES State Operations",
            url="https://streams.example.net/sa-ses/operations.mp3",
            status=StreamStatus.ERROR,
            enabled=True,
            createdAt=now - timedelta(hours=1, minutes=17),
            language="en",
            error="Link down: Mount Lofty receiver not responding",
            transcriptions=[],
            source=StreamSource.AUDIO,
            ignoreFirstSeconds=12.0,
        ),
        Stream(
            id="ses-pager",
            name="SA SES Pager Gateway",
            url="/api/pager-feeds/ses-pager",
            status=StreamStatus.TRANSCRIBING,
            enabled=True,
            createdAt=now - timedelta(hours=3, minutes=12),
            language=None,
            transcriptions=[],
            source=StreamSource.PAGER,
            webhookToken="demo-ses-token-451",
        ),
    ]

    for stream in streams:
        await database.save_stream(stream)

    transcription_records = [
        TranscriptionResult(
            id="adelaide-tower-start",
            streamId="adelaide-tower",
            text="Runway 23 recording resumed",
            timestamp=now - timedelta(minutes=18),
            eventType=TranscriptionEventType.RECORDING_STARTED,
            reviewStatus=TranscriptionReviewStatus.PENDING,
        ),
        TranscriptionResult(
            id="adelaide-tower-1",
            streamId="adelaide-tower",
            text="Qantas four two three, Adelaide Tower, wind two one zero at five, runway two three cleared to land.",
            timestamp=now - timedelta(minutes=15, seconds=32),
            confidence=0.89,
            duration=8.4,
            segments=[
                TranscriptionSegment(
                    id=0,
                    text="qantas four two three adelaide tower wind two one zero at five",
                    no_speech_prob=0.01,
                    temperature=0.0,
                    avg_logprob=-0.12,
                    compression_ratio=1.05,
                    start=0.0,
                    end=4.8,
                    seek=0,
                ),
                TranscriptionSegment(
                    id=1,
                    text="runway two three cleared to land",
                    no_speech_prob=0.02,
                    temperature=0.0,
                    avg_logprob=-0.11,
                    compression_ratio=1.01,
                    start=4.8,
                    end=8.4,
                    seek=0,
                ),
            ],
            recordingUrl="recordings/adelaide-tower/20240412-231520.wav",
            recordingStartOffset=5.0,
            reviewStatus=TranscriptionReviewStatus.PENDING,
        ),
        TranscriptionResult(
            id="adelaide-tower-2",
            streamId="adelaide-tower",
            text="Tower, Qantas four two three vacated runway two three, request taxi to bay nine.",
            timestamp=now - timedelta(minutes=14, seconds=48),
            confidence=0.94,
            duration=6.2,
            segments=[
                TranscriptionSegment(
                    id=0,
                    text="tower qantas four two three vacated",
                    no_speech_prob=0.01,
                    temperature=0.0,
                    avg_logprob=-0.08,
                    compression_ratio=1.02,
                    start=0.0,
                    end=3.2,
                    seek=0,
                ),
                TranscriptionSegment(
                    id=1,
                    text="runway two three request taxi to bay nine",
                    no_speech_prob=0.02,
                    temperature=0.0,
                    avg_logprob=-0.07,
                    compression_ratio=1.03,
                    start=3.2,
                    end=6.2,
                    seek=0,
                ),
            ],
            recordingUrl="recordings/adelaide-tower/20240412-231552.wav",
            reviewStatus=TranscriptionReviewStatus.CORRECTED,
            correctedText="Tower, Qantas 423 vacated runway 23. Request taxi to bay 9.",
            reviewedAt=now - timedelta(minutes=10),
            reviewedBy="A. Chen",
        ),
        TranscriptionResult(
            id="adelaide-tower-alert",
            streamId="adelaide-tower",
            text="Mayday Mayday Mayday, this is Lifesaver three three declaring smoke in the cabin over Gulf St Vincent.",
            timestamp=now - timedelta(minutes=6, seconds=10),
            confidence=0.72,
            duration=7.1,
            recordingUrl="recordings/adelaide-tower/20240412-232200.wav",
            alerts=[
                TranscriptionAlertTrigger(
                    ruleId="distress-mayday",
                    label="Distress: MAYDAY",
                    matchedPhrases=["mayday"],
                    playSound=True,
                    notify=True,
                )
            ],
            reviewStatus=TranscriptionReviewStatus.VERIFIED,
            reviewedAt=now - timedelta(minutes=4),
            reviewedBy="B. Singh",
        ),
        TranscriptionResult(
            id="ses-operations-1",
            streamId="ses-operations",
            text="Metro two four, respond to Burnside for tree down on dwelling, occupants uninjured but access blocked.",
            timestamp=now - timedelta(minutes=42),
            confidence=0.81,
            duration=5.6,
            recordingUrl="recordings/ses-operations/20240412-225800.wav",
            reviewStatus=TranscriptionReviewStatus.PENDING,
        ),
        TranscriptionResult(
            id="ses-operations-stop",
            streamId="ses-operations",
            text="Recording stopped due to repeated receiver dropouts",
            timestamp=now - timedelta(minutes=35),
            eventType=TranscriptionEventType.RECORDING_STOPPED,
            reviewStatus=TranscriptionReviewStatus.PENDING,
        ),
        TranscriptionResult(
            id="ses-pager-1",
            streamId="ses-pager",
            text="Pager message from SA SES: Port Adelaide unit respond to coastal flooding near Semaphore Road.",
            timestamp=now - timedelta(minutes=12, seconds=15),
            duration=0.0,
            reviewStatus=TranscriptionReviewStatus.PENDING,
        ),
        TranscriptionResult(
            id="ses-pager-2",
            streamId="ses-pager",
            text="Update: Incident downgraded to standby. Monitor tides and await council request for sandbag support.",
            timestamp=now - timedelta(minutes=4, seconds=30),
            duration=0.0,
            reviewStatus=TranscriptionReviewStatus.PENDING,
        ),
    ]

    for result in transcription_records:
        if result.recordingUrl:
            relative = Path(result.recordingUrl)
            if relative.parts and relative.parts[0] == "recordings":
                relative = Path(*relative.parts[1:])
            recordings.add(relative)
        await database.append_transcription(result)

    if recordings:
        _write_placeholder_recordings(recordings)


async def load_fixture_set(name: str, database: StreamDatabase) -> None:
    """Dispatch to the requested fixture loader."""
    loader = _fixture_loaders().get(normalize_fixture_set_name(name))
    if loader is None:
        raise ValueError(f"Unknown fixture set: {name}")
    await loader(database)


def normalize_fixture_set_name(name: str) -> str:
    """Return the canonical fixture set name or raise when unknown."""

    normalized = name.strip().lower()
    aliases: Dict[str, str] = {
        "demo": "screenshot",
        "demos": "screenshot",
        "screenshot": "screenshot",
        "screenshots": "screenshot",
    }

    return aliases.get(normalized, normalized)


def available_fixture_sets() -> list[str]:
    """List fixture sets that can be loaded without raising."""

    return sorted(_fixture_loaders().keys())


def _fixture_loaders() -> Dict[str, Callable[[StreamDatabase], Awaitable[None]]]:
    return {
        "screenshot": load_screenshot_fixtures,
    }


__all__ = [
    "available_fixture_sets",
    "load_fixture_set",
    "load_screenshot_fixtures",
    "normalize_fixture_set_name",
]
