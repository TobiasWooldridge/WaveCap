"""Helpers for working with timezone-aware timestamps."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional


def ensure_utc(value: datetime) -> datetime:
    """Return a timezone-aware datetime in UTC."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def isoformat_utc(value: datetime) -> str:
    """Format a datetime value as an ISO 8601 string with a ``Z`` suffix."""
    return ensure_utc(value).isoformat().replace("+00:00", "Z")


def parse_iso8601(value: str) -> datetime:
    """Parse an ISO 8601 timestamp, accepting a trailing ``Z`` for UTC."""
    if value.endswith("Z"):
        value = value[:-1] + "+00:00"
    return datetime.fromisoformat(value)


def optional_isoformat(value: Optional[datetime]) -> Optional[str]:
    """Serialize an optional datetime to ISO 8601 with ``Z`` suffix."""
    if value is None:
        return None
    return isoformat_utc(value)


def utcnow() -> datetime:
    """Return the current UTC time as an aware datetime."""
    return datetime.now(timezone.utc)
