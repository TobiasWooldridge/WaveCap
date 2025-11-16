"""Entrypoint for ``python -m wavecap_backend``."""

from __future__ import annotations

import argparse
import os
from typing import Optional, Sequence

import uvicorn

from .config import load_config
from .fixtures import available_fixture_sets, normalize_fixture_set_name
from .server import FIXTURE_ENV_VAR


def _resolve_fixture_set(fixture_set: Optional[str]) -> str:
    if not fixture_set:
        return ""

    normalized = normalize_fixture_set_name(fixture_set)
    available = set(available_fixture_sets())
    if normalized not in available:
        readable = ", ".join(sorted(available)) or "none"
        raise SystemExit(
            f"Unknown fixture set '{fixture_set}'. Available sets: {readable}."
        )
    return normalized


def main(argv: Optional[Sequence[str]] = None) -> None:
    parser = argparse.ArgumentParser(
        description="Run the WaveCap backend server."
    )
    parser.add_argument(
        "--reload", action="store_true", help="Enable autoreload for development."
    )
    parser.add_argument(
        "--fixture-set",
        dest="fixture_set",
        help="Load a predefined fixture set (e.g. 'screenshot') before starting.",
    )
    parser.add_argument(
        "--screenshot-fixtures",
        action="store_true",
        help="Shortcut for --fixture-set=screenshot to preload demo data.",
    )

    args = parser.parse_args(argv)

    fixture_set = args.fixture_set
    if args.screenshot_fixtures:
        fixture_set = "screenshot"

    resolved_fixture_set = _resolve_fixture_set(fixture_set)
    if resolved_fixture_set:
        os.environ[FIXTURE_ENV_VAR] = resolved_fixture_set

    config = load_config()
    host = config.server.host
    port = config.server.port

    uvicorn.run(
        "wavecap_backend.server:create_app",
        factory=True,
        host=host,
        port=port,
        reload=args.reload,
    )


if __name__ == "__main__":
    main()
