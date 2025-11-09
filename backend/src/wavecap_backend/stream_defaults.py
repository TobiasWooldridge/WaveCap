from __future__ import annotations

from typing import Optional

from .models import StreamSource

BROADCASTIFY_KEYWORD = "broadcastify"
BROADCASTIFY_PREROLL_SECONDS = 30.0
DEFAULT_RECORDING_RETENTION_SECONDS = 7 * 24 * 60 * 60  # 7 days


def resolve_ignore_first_seconds(
    source: StreamSource,
    url: Optional[str],
    configured_seconds: float,
) -> float:
    """Determine how many seconds of audio to skip before recording.

    Broadcastify feeds include a mandatory advertisement at the beginning of each
    connection. The product specification calls for skipping that pre-roll
    automatically so operators do not hear the ad. Administrators can still
    override the behaviour by explicitly configuring ``ignoreFirstSeconds`` for a
    stream.
    """

    try:
        configured = float(configured_seconds)
    except (TypeError, ValueError):
        configured = 0.0

    if configured > 0:
        return configured

    if source != StreamSource.AUDIO:
        return 0.0

    normalized_url = (url or "").strip().lower()
    if not normalized_url:
        return 0.0

    if BROADCASTIFY_KEYWORD in normalized_url:
        return BROADCASTIFY_PREROLL_SECONDS

    return 0.0


def resolve_recording_retention_seconds(
    configured_seconds: Optional[float],
) -> Optional[float]:
    """Return the effective retention window for a stream.

    ``None`` means "keep using the default"; non-positive values disable
    automatic deletion, allowing administrators to keep recordings indefinitely.
    """

    if configured_seconds is None:
        return float(DEFAULT_RECORDING_RETENTION_SECONDS)
    try:
        seconds = float(configured_seconds)
    except (TypeError, ValueError):
        return float(DEFAULT_RECORDING_RETENTION_SECONDS)
    if seconds <= 0:
        return None
    return seconds


__all__ = [
    "BROADCASTIFY_KEYWORD",
    "BROADCASTIFY_PREROLL_SECONDS",
    "DEFAULT_RECORDING_RETENTION_SECONDS",
    "resolve_recording_retention_seconds",
    "resolve_ignore_first_seconds",
]
