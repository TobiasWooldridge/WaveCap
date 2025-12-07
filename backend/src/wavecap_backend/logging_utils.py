"""Structured logging helpers for the backend."""

from __future__ import annotations

import json
import logging
import os
import re
import sys
from logging.handlers import RotatingFileHandler
from typing import Any

from .models import LoggingConfig
from .state_paths import LOG_DIR

# Pattern to detect tqdm progress bar output
_TQDM_PATTERN = re.compile(r"^\s*\d+%\|.*\|.*\[")


class TqdmFilter(logging.Filter):
    """Filter out tqdm progress bar output from log files."""

    def filter(self, record: logging.LogRecord) -> bool:
        # Filter out tqdm-style progress bars
        message = record.getMessage()
        if _TQDM_PATTERN.match(message):
            return False
        # Also filter lines that are just progress bar characters
        if message.strip().startswith("|") and "frames/s" in message:
            return False
        return True


def configure_logging(config: LoggingConfig) -> None:
    # Disable tqdm progress bars globally to reduce log noise
    os.environ.setdefault("TQDM_DISABLE", "1")
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
    )

    if not config.enabled:
        return

    if config.backend.enabled:
        backend_file = LOG_DIR / config.backend.fileName
        handler = RotatingFileHandler(
            backend_file, maxBytes=5 * 1024 * 1024, backupCount=3
        )
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")
        )
        # Filter out tqdm progress bars from log files
        handler.addFilter(TqdmFilter())
        root_logger = logging.getLogger()
        root_logger.addHandler(handler)


def record_frontend_event(payload: dict[str, Any], config: LoggingConfig) -> None:
    if not config.enabled or not config.frontend.enabled:
        return

    LOG_DIR.mkdir(parents=True, exist_ok=True)
    frontend_file = LOG_DIR / config.frontend.fileName
    with frontend_file.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False) + "\n")
