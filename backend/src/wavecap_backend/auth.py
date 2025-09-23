"""Authentication helpers for the WaveCap backend."""

from __future__ import annotations

import hmac
import secrets
import time
from dataclasses import dataclass
from typing import Dict, Optional

from .models import AccessControlConfig, AccessCredential, AccessDescriptor, AccessRole


class AuthenticationError(Exception):
    """Raised when authentication or authorization fails."""

    def __init__(self, message: str, status_code: int = 401):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@dataclass
class AuthSession:
    token: str
    role: AccessRole
    identifier: Optional[str]
    created_at: float
    expires_at: Optional[float]

    @property
    def is_expired(self) -> bool:
        return self.expires_at is not None and self.expires_at <= time.time()


class AuthManager:
    """Simple in-memory session manager backed by static credentials."""

    def __init__(self, config: AccessControlConfig):
        self._config = config
        self._sessions: Dict[str, AuthSession] = {}
        self._token_ttl_seconds: Optional[int] = (
            int(config.tokenTtlMinutes * 60) if config.tokenTtlMinutes else None
        )

    @property
    def config(self) -> AccessControlConfig:
        return self._config

    def _purge_expired(self) -> None:
        if not self._sessions:
            return
        expired_tokens = [
            token for token, session in self._sessions.items() if session.is_expired
        ]
        for token in expired_tokens:
            self._sessions.pop(token, None)

    def _credential_matches(
        self, credential: AccessCredential, identifier: Optional[str], password: str
    ) -> bool:
        if credential.identifier:
            if not identifier:
                return False
            if not hmac.compare_digest(credential.identifier, identifier):
                return False
        elif identifier:
            return False
        return hmac.compare_digest(credential.password, password)

    def authenticate(
        self, password: str, identifier: Optional[str] = None
    ) -> AuthSession:
        """Authenticate a viewer and issue a bearer token."""

        self._purge_expired()
        for credential in self._config.credentials:
            if self._credential_matches(credential, identifier, password):
                now = time.time()
                token = secrets.token_urlsafe(32)
                expires_at = (
                    now + self._token_ttl_seconds if self._token_ttl_seconds else None
                )
                session = AuthSession(
                    token=token,
                    role=credential.role,
                    identifier=credential.identifier,
                    created_at=now,
                    expires_at=expires_at,
                )
                self._sessions[token] = session
                return session
        raise AuthenticationError("Invalid credentials", status_code=401)

    def resolve_role(self, token: Optional[str]) -> AccessRole:
        self._purge_expired()
        if not token:
            return self._config.defaultRole
        session = self._sessions.get(token)
        if not session or session.is_expired:
            if token in self._sessions:
                self._sessions.pop(token, None)
            raise AuthenticationError("Invalid or expired token", status_code=401)
        return session.role

    def require_role(self, token: Optional[str], required: AccessRole) -> AccessRole:
        role = self.resolve_role(token)
        if role != required:
            raise AuthenticationError("Editor access required", status_code=403)
        return role

    def describe_access(self, token: Optional[str]) -> AccessDescriptor:
        self._purge_expired()
        requires_password = bool(self._config.credentials)
        if not token:
            return AccessDescriptor(
                defaultRole=self._config.defaultRole,
                role=self._config.defaultRole,
                authenticated=False,
                requiresPassword=requires_password,
            )
        session = self._sessions.get(token)
        if not session or session.is_expired:
            if token in self._sessions:
                self._sessions.pop(token, None)
            raise AuthenticationError("Invalid or expired token", status_code=401)
        return AccessDescriptor(
            defaultRole=self._config.defaultRole,
            role=session.role,
            authenticated=True,
            requiresPassword=requires_password,
            identifier=session.identifier,
        )

    def invalidate(self, token: Optional[str]) -> None:
        if token:
            self._sessions.pop(token, None)


__all__ = ["AuthManager", "AuthenticationError", "AuthSession"]
