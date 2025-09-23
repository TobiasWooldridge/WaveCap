"""Helpers for locating runtime state directories."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path


def _looks_like_checkout_root(path: Path) -> bool:
    """Return ``True`` when *path* appears to be the repository root."""

    return (path / "backend" / "default-config.yaml").exists()


@lru_cache(maxsize=1)
def _detect_project_root() -> Path:
    """Return the repository root when available.

    When the backend is executed from a source checkout we want to resolve
    paths relative to the top-level project directory (which contains the
    ``backend`` and ``frontend`` folders).  We walk up the filesystem from the
    current module location until we find that directory.  If the search fails
    (for example when the package is installed in site-packages) we fall back
    to the directory two levels up, matching the previous behaviour.
    """

    module_path = Path(__file__).resolve()

    candidates: list[Path] = []

    env_root = os.getenv("WAVECAP_PROJECT_ROOT")
    if env_root:
        try:
            resolved = Path(env_root).resolve()
        except OSError:
            resolved = None
        else:
            if resolved.exists():
                candidates.append(resolved)

    for parent in module_path.parents:
        candidates.append(parent)

    cwd = Path.cwd().resolve()
    candidates.append(cwd)
    candidates.extend(cwd.parents)

    seen = set()
    for candidate in candidates:
        if candidate in seen:
            continue
        seen.add(candidate)
        if _looks_like_checkout_root(candidate):
            return candidate

    return module_path.parents[2]


PROJECT_ROOT = _detect_project_root()
STATE_DIR = PROJECT_ROOT / "state"
RECORDINGS_DIR = STATE_DIR / "recordings"
LOG_DIR = STATE_DIR / "logs"


def resolve_state_path(*parts: str) -> Path:
    """Return the path within the state directory for the given parts."""

    return STATE_DIR.joinpath(*parts)


__all__ = ["STATE_DIR", "RECORDINGS_DIR", "LOG_DIR", "resolve_state_path"]
