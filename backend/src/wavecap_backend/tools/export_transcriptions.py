"""Export reviewed transcriptions into a dataset for Whisper fine-tuning."""

from __future__ import annotations

import argparse
import json
import logging
import asyncio
import shutil
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable, List, Optional

from wavecap_backend.database import StreamDatabase
from wavecap_backend.datetime_utils import (
    isoformat_utc,
    optional_isoformat,
    utcnow,
)
from wavecap_backend.models import TranscriptionResult, TranscriptionReviewStatus
from wavecap_backend.state_paths import RECORDINGS_DIR, resolve_state_path

LOGGER = logging.getLogger(__name__)

DEFAULT_STATUSES: tuple[TranscriptionReviewStatus, ...] = (
    TranscriptionReviewStatus.CORRECTED,
    TranscriptionReviewStatus.VERIFIED,
)


@dataclass(slots=True)
class ExportRecord:
    """Serializable payload describing a reviewed transcription."""

    id: str
    stream_id: str
    timestamp: str
    duration: Optional[float]
    text: str
    source_text: str
    review_status: str
    reviewed_at: Optional[str]
    reviewed_by: Optional[str]
    audio_filepath: Optional[str]

    def to_json(self) -> str:
        return json.dumps(
            {
                "id": self.id,
                "stream_id": self.stream_id,
                "timestamp": self.timestamp,
                "duration": self.duration,
                "text": self.text,
                "source_text": self.source_text,
                "review_status": self.review_status,
                "reviewed_at": self.reviewed_at,
                "reviewed_by": self.reviewed_by,
                "audio_filepath": self.audio_filepath,
            },
            ensure_ascii=False,
        )


def _format_datetime(value: Optional[datetime]) -> Optional[str]:
    return optional_isoformat(value)


def _normalise_text(transcription: TranscriptionResult) -> str:
    if transcription.correctedText and transcription.correctedText.strip():
        return transcription.correctedText.strip()
    return transcription.text.strip()


def _resolve_audio_path(transcription: TranscriptionResult) -> Optional[Path]:
    if not transcription.recordingUrl:
        return None
    candidate = RECORDINGS_DIR / Path(transcription.recordingUrl).name
    if not candidate.exists():
        LOGGER.warning(
            "Audio file missing for transcription %s: %s", transcription.id, candidate
        )
        return None
    return candidate


def _copy_audio_file(source: Path, destination_dir: Path) -> Path:
    destination_dir.mkdir(parents=True, exist_ok=True)
    destination = destination_dir / source.name
    if destination.exists():
        return destination
    shutil.copy2(source, destination)
    return destination


def _build_records(
    transcriptions: Iterable[TranscriptionResult],
    copy_audio: bool,
    output_dir: Path,
) -> List[ExportRecord]:
    audio_dir = output_dir / "audio"
    records: List[ExportRecord] = []
    for transcription in transcriptions:
        text = _normalise_text(transcription)
        if not text:
            LOGGER.debug(
                "Skipping transcription %s because the text is empty", transcription.id
            )
            continue
        audio_path = _resolve_audio_path(transcription)
        if audio_path and copy_audio:
            audio_path = _copy_audio_file(audio_path, audio_dir)
            relative_audio = audio_path.relative_to(output_dir)
            audio_value = str(relative_audio)
        elif audio_path:
            audio_value = str(audio_path.resolve())
        else:
            audio_value = None
        record = ExportRecord(
            id=transcription.id,
            stream_id=transcription.streamId,
            timestamp=_format_datetime(transcription.timestamp)
            or isoformat_utc(utcnow()),
            duration=transcription.duration,
            text=text,
            source_text=transcription.text,
            review_status=transcription.reviewStatus.value,
            reviewed_at=_format_datetime(transcription.reviewedAt),
            reviewed_by=transcription.reviewedBy,
            audio_filepath=audio_value,
        )
        records.append(record)
    return records


async def export_reviewed_transcriptions(
    db_path: Path,
    output_dir: Path,
    copy_audio: bool = True,
    statuses: Iterable[TranscriptionReviewStatus] = DEFAULT_STATUSES,
) -> List[ExportRecord]:
    if not db_path.exists():
        raise FileNotFoundError(f"Database not found: {db_path}")
    database = StreamDatabase(db_path)
    try:
        transcriptions = await database.export_transcriptions(list(statuses))
    finally:
        await database.close()
    output_dir.mkdir(parents=True, exist_ok=True)
    records = _build_records(
        transcriptions, copy_audio=copy_audio, output_dir=output_dir
    )
    jsonl_path = output_dir / "transcriptions.jsonl"
    with jsonl_path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(record.to_json())
            handle.write("\n")
    metadata = {
        "exported_at": isoformat_utc(utcnow()),
        "database": str(db_path.resolve()),
        "statuses": [status.value for status in statuses],
        "count": len(records),
        "audio_subdirectory": "audio" if copy_audio else None,
    }
    metadata_path = output_dir / "metadata.json"
    with metadata_path.open("w", encoding="utf-8") as handle:
        json.dump(metadata, handle, indent=2)
    return records


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--db",
        type=Path,
        default=resolve_state_path("runtime.sqlite"),
        help="Path to the SQLite database containing transcriptions (default: state/runtime.sqlite)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        required=True,
        help="Directory where the dataset will be written",
    )
    parser.add_argument(
        "--no-copy-audio",
        action="store_true",
        help="If provided, referenced audio files will not be copied alongside the dataset",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug logging",
    )
    return parser


def main(argv: Optional[List[str]] = None) -> None:
    parser = build_arg_parser()
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO)
    LOGGER.info("Exporting reviewed transcriptions from %s", args.db)
    copy_audio = not args.no_copy_audio
    records = asyncio.run(
        export_reviewed_transcriptions(
            args.db, args.output_dir, copy_audio=copy_audio
        )
    )
    LOGGER.info("Wrote %s reviewed transcriptions to %s", len(records), args.output_dir)


if __name__ == "__main__":  # pragma: no cover - manual execution entry point
    main()
