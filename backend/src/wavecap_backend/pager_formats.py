from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
import re
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

    raw_message = _stringify(payload.get("message"))
    parsed_raw = _parse_cfs_flex_raw_message(raw_message)

    inc = _stringify(payload.get("inc")) or parsed_raw.get("inc", "")
    alarm: Any = payload.get("alarm")
    call_type = _stringify(payload.get("type")) or parsed_raw.get("call_type", "")
    address = _normalise_address(payload.get("address"))
    if not address:
        address = _normalise_address(parsed_raw.get("address"))
    talkgroup = _stringify(payload.get("TG") or payload.get("tg"))
    if not talkgroup:
        talkgroup = parsed_raw.get("talkgroup", "")

    if _stringify(alarm) == "":
        alarm_candidate = parsed_raw.get("alarm")
        if alarm_candidate is not None:
            alarm = _coerce_alarm(alarm_candidate)

    timestamp: Optional[str] = None
    date_value = payload.get("date")
    if isinstance(date_value, Mapping):
        timestamp = _stringify(date_value.get("dateTime")) or None
    elif isinstance(date_value, str):
        timestamp = _stringify(date_value) or None
    if not timestamp:
        timestamp = parsed_raw.get("timestamp")

    summary_parts = [
        value
        for value in (inc, call_type, address, _format_alarm(alarm))
        if value
    ]
    summary = " – ".join(summary_parts)
    if not summary:
        summary = raw_message or "Pager alert"

    details: list[str] = []

    map_value: Any = payload.get("map") or parsed_raw.get("map")
    map_detail = _format_map_detail(map_value)
    if map_detail:
        details.append(map_detail)

    if talkgroup:
        details.append(f"Talkgroup {talkgroup}")

    narrative = _stringify(parsed_raw.get("narrative"))
    if narrative:
        details.append(f"Narrative: {narrative}")

    units = _stringify(parsed_raw.get("units"))
    if units:
        details.append(f"Units: {units}")

    if raw_message and raw_message != summary:
        details.append(f"Raw message: {raw_message}")

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
    if isinstance(map_value, str):
        map_text = _stringify(map_value)
        return f"Map: {map_text}" if map_text else ""

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


def _coerce_alarm(value: Any) -> Any:
    value_str = _stringify(value)
    if not value_str:
        return ""
    try:
        return int(value_str)
    except ValueError:
        return value_str


def _parse_cfs_flex_raw_message(raw_message: str) -> dict[str, Any]:
    text = _stringify(raw_message)
    if not text:
        return {}

    parts = [segment.strip() for segment in text.split("|") if segment]
    parsed: dict[str, Any] = {}

    if len(parts) >= 2:
        timestamp_text = parts[1]
        normalised_timestamp = _parse_flex_timestamp(timestamp_text)
        if normalised_timestamp:
            parsed["timestamp"] = normalised_timestamp

    message_body = parts[-1] if parts else text
    if message_body.upper().startswith("MFS:"):
        message_body = message_body[4:].strip()

    inc_match = re.search(r"\bINC\d+\b", message_body)
    if inc_match:
        parsed["inc"] = inc_match.group()

    respond_index = message_body.upper().find("RESPOND ")
    remainder_after_call = ""
    if respond_index != -1:
        after_respond = message_body[respond_index + len("RESPOND ") :]
        if "," in after_respond:
            call_type, remainder_after_call = after_respond.split(",", 1)
        else:
            call_type, remainder_after_call = after_respond, ""
        call_type = call_type.strip()
        if call_type:
            parsed["call_type"] = call_type

    alarm_match = re.search(r"ALARM LEVEL:\s*([0-9]+)", message_body, flags=re.IGNORECASE)
    remainder_after_alarm = ""
    if alarm_match:
        parsed["alarm"] = alarm_match.group(1)
        remainder_after_alarm = message_body[alarm_match.end() :]
    else:
        remainder_after_alarm = remainder_after_call

    address_remainder = remainder_after_alarm.lstrip(", ")
    address = _extract_address(address_remainder)
    if address:
        parsed["address"] = address

    map_match = re.search(r"MAP:\s*([^,]+)", message_body, flags=re.IGNORECASE)
    if map_match:
        parsed["map"] = map_match.group(1).strip()

    talkgroup_match = re.search(r"TG\s*([^,]+)", message_body, flags=re.IGNORECASE)
    if talkgroup_match:
        parsed["talkgroup"] = talkgroup_match.group(1).strip()

    narrative_match = re.search(r"==\s*([^:,]+)", message_body)
    if narrative_match:
        parsed["narrative"] = narrative_match.group(1).strip()

    units_match = re.search(r":\s*([A-Z]{2,}\d+(?:\s+[A-Z]{2,}\d+)*)\s*:", message_body)
    if units_match:
        parsed["units"] = " ".join(units_match.group(1).split())

    return parsed


def _parse_flex_timestamp(value: str) -> Optional[str]:
    value = _stringify(value)
    if not value:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S"):
        try:
            parsed = datetime.strptime(value, fmt)
        except ValueError:
            continue
        return parsed.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
    return None


def _extract_address(remainder: str) -> str:
    if not remainder:
        return ""
    segments = remainder.split(",")
    collected: list[str] = []
    for segment in segments:
        stripped = segment.strip()
        if not stripped:
            continue
        upper = stripped.upper()
        if upper.startswith(("MAP:", "TG", "==", ":")):
            break
        collected.append(stripped)
    return ", ".join(collected)


__all__ = ["PagerWebhookFormat", "parse_pager_webhook_payload"]
