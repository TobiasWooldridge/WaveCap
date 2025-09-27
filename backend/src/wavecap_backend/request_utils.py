"""Request helper utilities."""

from __future__ import annotations

from typing import Mapping, Optional, Protocol, Sequence, Tuple, Union


class SupportsClientAddress(Protocol):
    host: str
    port: Union[int, str]


ClientAddress = Union[SupportsClientAddress, Tuple[str, int], Tuple[str, int, int]]


def _normalise_headers(headers: Mapping[str, str]) -> dict[str, str]:
    """Return a lower-cased copy of HTTP headers."""

    normalised: dict[str, str] = {}
    for key, value in headers.items():
        if not isinstance(key, str) or not isinstance(value, str):
            continue
        normalised[key.lower()] = value
    return normalised


def _split_csv(value: str) -> Sequence[str]:
    return [part.strip() for part in value.split(",") if part.strip()]


def _extract_client_components(client: Optional[ClientAddress]) -> tuple[Optional[str], Optional[str]]:
    if client is None:
        return None, None

    host: Optional[str] = None
    port: Optional[str] = None

    if hasattr(client, "host"):
        host_value = getattr(client, "host")
        if isinstance(host_value, str) and host_value:
            host = host_value
    if hasattr(client, "port"):
        port_value = getattr(client, "port")
        if isinstance(port_value, int):
            port = str(port_value)
        elif isinstance(port_value, str) and port_value:
            port = port_value

    if isinstance(client, tuple):
        if host is None and len(client) >= 1 and isinstance(client[0], str):
            host = client[0]
        if port is None and len(client) >= 2:
            port_candidate = client[1]
            if isinstance(port_candidate, int):
                port = str(port_candidate)
            elif isinstance(port_candidate, str) and port_candidate:
                port = port_candidate

    return host, port


def _pick_first_header(normalised: Mapping[str, str], names: Sequence[str]) -> Optional[str]:
    for name in names:
        value = normalised.get(name)
        if value:
            stripped = value.strip()
            if stripped:
                return stripped
    return None


def describe_remote_client(headers: Mapping[str, str], client: Optional[ClientAddress]) -> str:
    """Return a descriptive label for the remote client.

    The function prioritises proxy headers such as ``CF-Connecting-IP`` and
    ``X-Forwarded-For`` while falling back to the transport address reported by
    ASGI when no proxy metadata is provided.
    """

    normalised = _normalise_headers(headers)

    host_headers = (
        "cf-connecting-ip",
        "true-client-ip",
        "x-real-ip",
    )
    host = _pick_first_header(normalised, host_headers)
    if not host:
        forwarded_for = normalised.get("x-forwarded-for")
        if forwarded_for:
            forwarded_chain = _split_csv(forwarded_for)
            if forwarded_chain:
                host = forwarded_chain[0]

    fallback_host, fallback_port = _extract_client_components(client)
    if not host:
        host = fallback_host

    port_headers = ("cf-connecting-port", "x-forwarded-port")
    port = _pick_first_header(normalised, port_headers)
    if not port:
        port = fallback_port

    if host and port:
        return f"{host}:{port}"
    if host:
        return host
    if port:
        return f"unknown:{port}"
    return "unknown-client"


__all__ = ["describe_remote_client"]
