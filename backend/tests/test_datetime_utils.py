"""Tests for datetime utility functions."""

from datetime import datetime, timezone, timedelta

from wavecap_backend.datetime_utils import (
    ensure_utc,
    isoformat_utc,
    optional_isoformat,
    parse_iso8601,
    utcnow,
)


def test_ensure_utc_naive_datetime():
    """Naive datetimes are assumed to be UTC."""
    naive = datetime(2025, 6, 15, 12, 30, 45)
    result = ensure_utc(naive)

    assert result.tzinfo == timezone.utc
    assert result.hour == 12


def test_ensure_utc_utc_datetime():
    """UTC datetimes are returned unchanged."""
    utc_dt = datetime(2025, 6, 15, 12, 30, 45, tzinfo=timezone.utc)
    result = ensure_utc(utc_dt)

    assert result.tzinfo == timezone.utc
    assert result == utc_dt


def test_ensure_utc_non_utc_timezone():
    """Non-UTC timezones are converted to UTC."""
    # UTC+5
    plus_five = timezone(timedelta(hours=5))
    non_utc = datetime(2025, 6, 15, 17, 30, 45, tzinfo=plus_five)

    result = ensure_utc(non_utc)

    assert result.tzinfo == timezone.utc
    # 17:30 in UTC+5 = 12:30 in UTC
    assert result.hour == 12
    assert result.minute == 30


def test_isoformat_utc_produces_z_suffix():
    """isoformat_utc outputs ISO 8601 with Z suffix."""
    dt = datetime(2025, 6, 15, 12, 30, 45, tzinfo=timezone.utc)

    result = isoformat_utc(dt)

    assert result == "2025-06-15T12:30:45Z"
    assert result.endswith("Z")
    assert "+00:00" not in result


def test_isoformat_utc_converts_timezone():
    """isoformat_utc converts non-UTC timezones before formatting."""
    plus_three = timezone(timedelta(hours=3))
    dt = datetime(2025, 6, 15, 15, 30, 45, tzinfo=plus_three)

    result = isoformat_utc(dt)

    # 15:30 in UTC+3 = 12:30 in UTC
    assert result == "2025-06-15T12:30:45Z"


def test_isoformat_utc_with_microseconds():
    """isoformat_utc preserves microseconds."""
    dt = datetime(2025, 6, 15, 12, 30, 45, 123456, tzinfo=timezone.utc)

    result = isoformat_utc(dt)

    assert result == "2025-06-15T12:30:45.123456Z"


def test_parse_iso8601_with_z_suffix():
    """parse_iso8601 handles trailing Z for UTC."""
    result = parse_iso8601("2025-06-15T12:30:45Z")

    assert result.year == 2025
    assert result.month == 6
    assert result.day == 15
    assert result.hour == 12
    assert result.minute == 30
    assert result.second == 45
    assert result.tzinfo == timezone.utc


def test_parse_iso8601_with_offset():
    """parse_iso8601 handles explicit timezone offsets."""
    result = parse_iso8601("2025-06-15T12:30:45+05:00")

    assert result.hour == 12
    assert result.tzinfo is not None
    assert result.utcoffset() == timedelta(hours=5)


def test_parse_iso8601_with_microseconds():
    """parse_iso8601 handles microseconds."""
    result = parse_iso8601("2025-06-15T12:30:45.123456Z")

    assert result.microsecond == 123456


def test_parse_iso8601_without_timezone():
    """parse_iso8601 handles timestamps without timezone info."""
    result = parse_iso8601("2025-06-15T12:30:45")

    assert result.tzinfo is None
    assert result.hour == 12


def test_optional_isoformat_returns_none():
    """optional_isoformat returns None for None input."""
    result = optional_isoformat(None)

    assert result is None


def test_optional_isoformat_formats_datetime():
    """optional_isoformat formats a datetime like isoformat_utc."""
    dt = datetime(2025, 6, 15, 12, 30, 45, tzinfo=timezone.utc)

    result = optional_isoformat(dt)

    assert result == "2025-06-15T12:30:45Z"


def test_utcnow_returns_aware_datetime():
    """utcnow returns a timezone-aware datetime in UTC."""
    before = datetime.now(timezone.utc)
    result = utcnow()
    after = datetime.now(timezone.utc)

    assert result.tzinfo == timezone.utc
    assert before <= result <= after


def test_roundtrip_isoformat_parse():
    """isoformat_utc and parse_iso8601 are inverses."""
    original = datetime(2025, 6, 15, 12, 30, 45, 123456, tzinfo=timezone.utc)

    formatted = isoformat_utc(original)
    parsed = parse_iso8601(formatted)

    assert parsed == original
