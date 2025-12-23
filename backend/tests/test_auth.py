"""Tests for authentication and session management."""

import time

import pytest

from wavecap_backend.auth import AuthManager, AuthenticationError, AuthSession
from wavecap_backend.models import AccessControlConfig, AccessCredential, AccessRole


def _make_config(
    *,
    credentials: list[dict] | None = None,
    default_role: str = "read_only",
    token_ttl_minutes: float | None = None,
) -> AccessControlConfig:
    creds = credentials or [{"password": "secret", "role": "editor"}]
    return AccessControlConfig(
        defaultRole=AccessRole(default_role),
        credentials=[AccessCredential.model_validate(c) for c in creds],
        tokenTtlMinutes=token_ttl_minutes,
    )


def test_authenticate_returns_session_with_token():
    config = _make_config()
    manager = AuthManager(config)

    session = manager.authenticate("secret")

    assert session.token
    assert len(session.token) > 20
    assert session.role == AccessRole.EDITOR


def test_authenticate_invalid_password_raises():
    config = _make_config()
    manager = AuthManager(config)

    with pytest.raises(AuthenticationError) as exc_info:
        manager.authenticate("wrong-password")

    assert exc_info.value.status_code == 401


def test_authenticate_with_identifier():
    config = _make_config(
        credentials=[{"identifier": "admin", "password": "admin123", "role": "editor"}]
    )
    manager = AuthManager(config)

    session = manager.authenticate("admin123", identifier="admin")

    assert session.identifier == "admin"
    assert session.role == AccessRole.EDITOR


def test_authenticate_wrong_identifier_raises():
    config = _make_config(
        credentials=[{"identifier": "admin", "password": "admin123", "role": "editor"}]
    )
    manager = AuthManager(config)

    with pytest.raises(AuthenticationError):
        manager.authenticate("admin123", identifier="wrong-user")


def test_authenticate_missing_identifier_raises():
    config = _make_config(
        credentials=[{"identifier": "admin", "password": "admin123", "role": "editor"}]
    )
    manager = AuthManager(config)

    with pytest.raises(AuthenticationError):
        manager.authenticate("admin123")  # No identifier provided


def test_authenticate_unexpected_identifier_raises():
    config = _make_config(credentials=[{"password": "nouser", "role": "editor"}])
    manager = AuthManager(config)

    with pytest.raises(AuthenticationError):
        manager.authenticate("nouser", identifier="someone")


def test_resolve_role_returns_session_role():
    config = _make_config()
    manager = AuthManager(config)
    session = manager.authenticate("secret")

    role = manager.resolve_role(session.token)

    assert role == AccessRole.EDITOR


def test_resolve_role_no_token_returns_default():
    config = _make_config(default_role="read_only")
    manager = AuthManager(config)

    role = manager.resolve_role(None)

    assert role == AccessRole.READ_ONLY


def test_resolve_role_invalid_token_raises():
    config = _make_config()
    manager = AuthManager(config)

    with pytest.raises(AuthenticationError) as exc_info:
        manager.resolve_role("invalid-token")

    assert exc_info.value.status_code == 401


def test_session_expires_after_ttl(monkeypatch: pytest.MonkeyPatch):
    config = _make_config(token_ttl_minutes=1)  # 1 minute
    manager = AuthManager(config)
    session = manager.authenticate("secret")

    # Session should be valid immediately
    assert manager.resolve_role(session.token) == AccessRole.EDITOR

    # Fast-forward time past expiration (more than 60 seconds)
    future_time = time.time() + 120.0
    monkeypatch.setattr(time, "time", lambda: future_time)

    with pytest.raises(AuthenticationError):
        manager.resolve_role(session.token)


def test_session_without_ttl_never_expires(monkeypatch: pytest.MonkeyPatch):
    config = _make_config(token_ttl_minutes=None)
    manager = AuthManager(config)
    session = manager.authenticate("secret")

    # Fast-forward time significantly
    future_time = time.time() + 86400 * 365  # One year
    monkeypatch.setattr(time, "time", lambda: future_time)

    # Should still be valid
    assert manager.resolve_role(session.token) == AccessRole.EDITOR


def test_require_role_passes_for_matching_role():
    config = _make_config()
    manager = AuthManager(config)
    session = manager.authenticate("secret")

    role = manager.require_role(session.token, AccessRole.EDITOR)

    assert role == AccessRole.EDITOR


def test_require_role_raises_403_for_wrong_role():
    config = _make_config(
        credentials=[{"password": "viewer", "role": "read_only"}]
    )
    manager = AuthManager(config)
    session = manager.authenticate("viewer")

    with pytest.raises(AuthenticationError) as exc_info:
        manager.require_role(session.token, AccessRole.EDITOR)

    assert exc_info.value.status_code == 403


def test_invalidate_removes_session():
    config = _make_config()
    manager = AuthManager(config)
    session = manager.authenticate("secret")

    # Session is valid
    assert manager.resolve_role(session.token) == AccessRole.EDITOR

    manager.invalidate(session.token)

    # Session is now invalid
    with pytest.raises(AuthenticationError):
        manager.resolve_role(session.token)


def test_invalidate_none_is_safe():
    config = _make_config()
    manager = AuthManager(config)

    # Should not raise
    manager.invalidate(None)


def test_describe_access_unauthenticated():
    config = _make_config(default_role="read_only")
    manager = AuthManager(config)

    descriptor = manager.describe_access(None)

    assert descriptor.authenticated is False
    assert descriptor.role == AccessRole.READ_ONLY
    assert descriptor.defaultRole == AccessRole.READ_ONLY
    assert descriptor.requiresPassword is True


def test_describe_access_authenticated():
    config = _make_config()
    manager = AuthManager(config)
    session = manager.authenticate("secret")

    descriptor = manager.describe_access(session.token)

    assert descriptor.authenticated is True
    assert descriptor.role == AccessRole.EDITOR
    assert descriptor.requiresPassword is True


def test_describe_access_with_identifier():
    config = _make_config(
        credentials=[{"identifier": "admin", "password": "pass", "role": "editor"}]
    )
    manager = AuthManager(config)
    session = manager.authenticate("pass", identifier="admin")

    descriptor = manager.describe_access(session.token)

    assert descriptor.identifier == "admin"


def test_describe_access_invalid_token_raises():
    config = _make_config()
    manager = AuthManager(config)

    with pytest.raises(AuthenticationError):
        manager.describe_access("bad-token")


def test_describe_access_no_credentials():
    config = AccessControlConfig(
        defaultRole=AccessRole.EDITOR,
        credentials=[],
    )
    manager = AuthManager(config)

    descriptor = manager.describe_access(None)

    assert descriptor.requiresPassword is False
    assert descriptor.role == AccessRole.EDITOR


def test_auth_session_is_expired_property():
    now = time.time()

    expired = AuthSession(
        token="t1",
        role=AccessRole.EDITOR,
        identifier=None,
        created_at=now - 100,
        expires_at=now - 1,
    )
    assert expired.is_expired is True

    valid = AuthSession(
        token="t2",
        role=AccessRole.EDITOR,
        identifier=None,
        created_at=now,
        expires_at=now + 100,
    )
    assert valid.is_expired is False

    no_expiry = AuthSession(
        token="t3",
        role=AccessRole.EDITOR,
        identifier=None,
        created_at=now,
        expires_at=None,
    )
    assert no_expiry.is_expired is False
