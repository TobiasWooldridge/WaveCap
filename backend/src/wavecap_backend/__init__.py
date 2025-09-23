"""WaveCap backend package."""

from __future__ import annotations

from typing import Any

__all__ = ["create_app"]


def create_app(*args: Any, **kwargs: Any):
    """Proxy to :func:`wavecap_backend.server.create_app` without importing it eagerly."""

    from .server import create_app as _create_app

    return _create_app(*args, **kwargs)
