"""Entrypoint for ``python -m wavecap_backend``."""

from __future__ import annotations

import argparse
import os
from typing import Optional, Sequence

import uvicorn

from .server import FIXTURE_ENV_VAR


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
    if fixture_set:
        os.environ[FIXTURE_ENV_VAR] = fixture_set

    uvicorn.run(
        "wavecap_backend.server:create_app",
        factory=True,
        host="0.0.0.0",
        port=8000,
        reload=args.reload,
    )


if __name__ == "__main__":
    main()
