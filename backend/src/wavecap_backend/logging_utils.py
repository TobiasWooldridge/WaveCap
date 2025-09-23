"""Structured logging helpers for the backend."""

from __future__ import annotations

import json
import logging
from logging.handlers import RotatingFileHandler
from typing import Any

from .models import LoggingConfig
from .state_paths import LOG_DIR


def configure_logging(config: LoggingConfig) -> None:
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
        root_logger = logging.getLogger()
        root_logger.addHandler(handler)


def record_frontend_event(payload: dict[str, Any], config: LoggingConfig) -> None:
    if not config.enabled or not config.frontend.enabled:
        return

    LOG_DIR.mkdir(parents=True, exist_ok=True)
    frontend_file = LOG_DIR / config.frontend.fileName
    with frontend_file.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload, ensure_ascii=False) + "\n")
