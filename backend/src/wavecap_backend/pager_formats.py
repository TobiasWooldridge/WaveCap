from __future__ import annotations

from enum import Enum
from typing import Any, Mapping, Optional

from .models import PagerWebhookRequest


class PagerWebhookFormat(str, Enum):
    """Known structured pager webhook payload formats."""

    CFS_FLEX = "cfs-flex"


def parse_pager_webhook_payload(
    payload: Mapping[str, Any], format_hint: Optional[str] = None
) -> PagerWebhookRequest:
    """Convert an incoming webhook payload into a :class:`PagerWebhookRequest`.

    Parameters
    ----------
    payload:
        Raw body submitted to the pager webhook endpoint.
    format_hint:
        Optional format identifier supplied by the client. When omitted, the
        payload is interpreted as the canonical :class:`PagerWebhookRequest`
        structure.

    Returns
    -------
    PagerWebhookRequest
        Normalised webhook payload.

    Raises
    ------
    ValueError
        Raised when the payload cannot be parsed or when the ``format_hint`` is
        unknown.
    """

    if format_hint in (None, ""):
        try:
            return PagerWebhookRequest.model_validate(payload)
        except Exception as exc:  # pragma: no cover - rewrap validation errors
            raise ValueError(str(exc)) from exc

    try:
        format_value = PagerWebhookFormat(format_hint)
    except ValueError as exc:  # pragma: no cover - defensive guard
        raise ValueError(f"Unsupported pager webhook format: {format_hint}") from exc

    if format_value is PagerWebhookFormat.CFS_FLEX:
        return _parse_cfs_flex(payload)

    raise ValueError(f"Unsupported pager webhook format: {format_hint}")


def _parse_cfs_flex(payload: Mapping[str, Any]) -> PagerWebhookRequest:
    if not isinstance(payload, Mapping):
        raise ValueError("CFS Flex payload must be a JSON object")

    inc = _stringify(payload.get("inc"))
    alarm = payload.get("alarm")
    call_type = _stringify(payload.get("type"))
    address = _normalise_address(payload.get("address"))
    talkgroup = _stringify(payload.get("TG") or payload.get("tg"))
    raw_message = _stringify(payload.get("message"))

    timestamp: Optional[str] = None
    date_value = payload.get("date")
    if isinstance(date_value, Mapping):
        timestamp = _stringify(date_value.get("dateTime")) or None
    elif isinstance(date_value, str):
        timestamp = _stringify(date_value) or None

    summary_parts = [
        value
        for value in (inc, call_type, address, _format_alarm(alarm))
        if value
    ]
    summary = " – ".join(summary_parts)
    if not summary:
        summary = raw_message or "Pager alert"

    details: list[str] = []

    map_value = payload.get("map")
    map_detail = _format_map_detail(map_value)
    if map_detail:
        details.append(map_detail)

    if talkgroup:
        details.append(f"Talkgroup {talkgroup}")

    if raw_message and raw_message != summary:
        details.append(raw_message)

    return PagerWebhookRequest(
        message=summary,
        sender=None,
        priority=None,
        timestamp=timestamp,
        details=details or None,
    )


def _stringify(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _normalise_address(value: Any) -> str:
    raw = _stringify(value)
    if not raw:
        return ""
    cleaned = raw.lstrip(": ")
    if cleaned.startswith("@"):
        cleaned = cleaned[1:]
    return cleaned.strip()


def _format_alarm(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (int, float)):
        if value == int(value):
            value = int(value)
    value_str = _stringify(value)
    return f"Alarm level {value_str}" if value_str else ""


def _format_map_detail(map_value: Any) -> str:
    if not isinstance(map_value, Mapping):
        return ""
    map_type = _stringify(map_value.get("type"))
    page = _stringify(map_value.get("page"))
    grid_value = map_value.get("grid")
    grid_text = ""
    if isinstance(grid_value, (list, tuple)):
        parts: list[str] = []
        for part in grid_value:
            part_text = _stringify(part)
            if part_text:
                parts.append(part_text)
        grid_text = "".join(parts)
    else:
        grid_text = _stringify(grid_value)

    components = [value for value in (map_type, page, grid_text) if value]
    if not components:
        return ""
    return f"Map: {' '.join(components)}"


__all__ = ["PagerWebhookFormat", "parse_pager_webhook_payload"]
