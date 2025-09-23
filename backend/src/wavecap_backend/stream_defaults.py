from __future__ import annotations

from typing import Optional

from .models import StreamSource

BROADCASTIFY_KEYWORD = "broadcastify"
BROADCASTIFY_PREROLL_SECONDS = 30.0


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


__all__ = [
    "BROADCASTIFY_KEYWORD",
    "BROADCASTIFY_PREROLL_SECONDS",
    "resolve_ignore_first_seconds",
]
