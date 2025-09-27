from typing import NamedTuple

from wavecap_backend.request_utils import describe_remote_client


class DummyAddress(NamedTuple):
    host: str
    port: int


def test_prefers_proxy_headers_over_client_address() -> None:
    headers = {
        "CF-Connecting-IP": "203.0.113.10",
        "CF-Connecting-Port": "8443",
        "X-Forwarded-For": "198.51.100.5, 192.0.2.4",
    }
    client = DummyAddress(host="10.0.0.2", port=1234)

    label = describe_remote_client(headers, client)

    assert label == "203.0.113.10:8443"


def test_falls_back_to_first_forwarded_for() -> None:
    headers = {"X-Forwarded-For": "198.51.100.5, 192.0.2.4"}
    client = DummyAddress(host="10.0.0.2", port=1234)

    label = describe_remote_client(headers, client)

    assert label == "198.51.100.5:1234"


def test_uses_transport_address_when_no_headers_present() -> None:
    headers: dict[str, str] = {}
    client = DummyAddress(host="10.0.0.2", port=1234)

    label = describe_remote_client(headers, client)

    assert label == "10.0.0.2:1234"


def test_handles_missing_port_information() -> None:
    headers = {"X-Real-IP": "198.51.100.5"}

    label = describe_remote_client(headers, None)

    assert label == "198.51.100.5"


def test_returns_unknown_when_details_missing() -> None:
    assert describe_remote_client({}, None) == "unknown-client"
