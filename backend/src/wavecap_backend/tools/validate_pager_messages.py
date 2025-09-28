"""Validate that stored pager messages can be parsed from raw FLEX lines.

Usage:

  python -m wavecap_backend.tools.validate_pager_messages \
      [--db state/runtime.sqlite] [--stream <id>] [--fix-missing-incident]

This scans all pager streams (or a single stream when --stream is provided),
extracts the raw FLEX line for each transcription, and runs it through the
``cfs-flex`` parser. It reports counts and any failures. With
``--fix-missing-incident``, it backfills ``pagerIncident`` on records that have
no incident but do have a parsable raw FLEX line.
"""

from __future__ import annotations

import argparse
import asyncio
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from wavecap_backend.database import StreamDatabase
from wavecap_backend.models import PagerIncidentDetails, StreamSource, TranscriptionResult
from wavecap_backend.pager_formats import parse_pager_webhook_payload
from wavecap_backend.state_paths import resolve_state_path


def _extract_raw_message(transcription: TranscriptionResult) -> Optional[str]:
    """Best-effort extraction of the raw FLEX line from a transcription.

    Priority order:
    1) ``transcription.pagerIncident.rawMessage`` when available.
    2) A line in ``text`` like "• Raw message: ..." or "Raw message: ...".
    3) Any line that looks like a FLEX payload, e.g. ``FLEX|...|``.
    """

    inc = transcription.pagerIncident
    if inc and getattr(inc, "rawMessage", None):
        value = inc.rawMessage.strip()
        if value:
            return value

    candidates: list[str] = []
    for line in (transcription.text or "").splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("• "):
            line = line[2:].strip()
        lower = line.lower()
        if lower.startswith("raw message:"):
            return line.split(":", 1)[1].strip()
        candidates.append(line)

    for line in reversed(candidates):
        if line.upper().startswith("FLEX|"):
            return line

    return None


@dataclass(slots=True)
class ValidationStats:
    total: int = 0
    with_raw: int = 0
    parsed_ok: int = 0
    missing_raw: int = 0
    parse_errors: int = 0
    fixed: int = 0


async def validate_pager_messages(
    db_path: str,
    stream_id: Optional[str] = None,
    fix_missing_incident: bool = False,
) -> int:
    from pathlib import Path
    db = StreamDatabase(Path(db_path))
    await db.initialize()

    # Determine which streams to scan
    streams = await db.load_streams()
    pager_stream_ids = [
        s.id for s in streams if s.source == StreamSource.PAGER and (not stream_id or s.id == stream_id)
    ]
    if not pager_stream_ids:
        print("No pager streams found to validate.")
        return 0

    stats = ValidationStats()
    failures: list[tuple[str, str, datetime, Optional[str], str]] = []

    for sid in pager_stream_ids:
        transcriptions = await db.export_pager_messages(sid)
        for t in transcriptions:
            stats.total += 1
            raw = _extract_raw_message(t)
            if not raw:
                stats.missing_raw += 1
                failures.append((sid, t.id, t.timestamp, None, "missing raw FLEX line"))
                continue
            stats.with_raw += 1
            try:
                req = parse_pager_webhook_payload({"message": raw}, "cfs-flex")
            except Exception as exc:
                stats.parse_errors += 1
                failures.append((sid, t.id, t.timestamp, raw, str(exc)))
                continue

            stats.parsed_ok += 1

            if fix_missing_incident and t.pagerIncident is None and req.incident is not None:
                # Backfill missing incident details using the parsed output.
                t.pagerIncident = PagerIncidentDetails.model_validate(req.incident)
                await db.append_transcription(t)
                stats.fixed += 1

    # Report
    print("Pager validation summary")
    print("------------------------")
    print(f"Streams scanned: {len(pager_stream_ids)}")
    print(f"Total messages: {stats.total}")
    print(f"With raw FLEX: {stats.with_raw}")
    print(f"Parsed OK: {stats.parsed_ok}")
    print(f"Missing raw: {stats.missing_raw}")
    print(f"Parse errors: {stats.parse_errors}")
    if fix_missing_incident:
        print(f"Backfilled incidents: {stats.fixed}")

    if failures:
        print()
        print("Failures")
        print("--------")
        for sid, tid, ts, raw, err in failures:
            ts_text = ts.isoformat()
            print(f"- stream={sid} id={tid} ts={ts_text}")
            if raw:
                short_raw = raw if len(raw) <= 200 else raw[:200] + "…"
                print(f"  raw: {short_raw}")
            print(f"  error: {err}")

    await db.close()
    return 1 if failures else 0


def main() -> None:  # pragma: no cover - thin CLI wrapper
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", default=str(resolve_state_path("runtime.sqlite")), help="Path to runtime.sqlite")
    parser.add_argument("--stream", default=None, help="Validate a single pager stream by id")
    parser.add_argument(
        "--fix-missing-incident",
        action="store_true",
        help="Backfill pagerIncident when a raw FLEX line parses successfully",
    )
    args = parser.parse_args()
    exit_code = asyncio.run(
        validate_pager_messages(args.db, stream_id=args.stream, fix_missing_incident=args.fix_missing_incident)
    )
    raise SystemExit(exit_code)


if __name__ == "__main__":  # pragma: no cover
    main()
