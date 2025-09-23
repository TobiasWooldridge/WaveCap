"""Tests for configuration path resolution."""

from pathlib import Path

import wavecap_backend.config as config_module
from wavecap_backend.auth import AuthManager
from wavecap_backend.config import load_config
from wavecap_backend.models import AccessRole, TranscriptionReviewStatus
from wavecap_backend.state_paths import PROJECT_ROOT


def test_project_root_points_to_repository_root() -> None:
    """The project root should resolve to the repository checkout directory."""

    expected_root = Path(__file__).resolve().parents[2]
    assert PROJECT_ROOT == expected_root
    assert (PROJECT_ROOT / "backend" / "default-config.yaml").exists()


def test_load_config_uses_repository_defaults() -> None:
    """A fresh checkout should load defaults from version-controlled files."""

    config = load_config()
    assert config_module.resolve_state_path("config.yaml").exists()
    assert config.server.corsOrigin == "*"
    assert any(stream.id == "broadcastify-2653" for stream in config.defaultStreams)
    target = next(
        stream for stream in config.defaultStreams if stream.id == "broadcastify-2653"
    )
    assert target.ignoreFirstSeconds == 30
    assert config.ui.themeMode.value == "system"
    assert config.ui.reviewExportStatuses == [
        TranscriptionReviewStatus.CORRECTED,
        TranscriptionReviewStatus.VERIFIED,
    ]


def test_state_config_can_clear_default_streams(tmp_path: Path) -> None:
    """Users can override the shipped streams by setting an empty list."""

    override_path = tmp_path / "config.yaml"
    override_path.write_text("defaultStreams: []\n")

    config = load_config()

    assert config.defaultStreams == []


def test_default_config_supports_password_only_login() -> None:
    """The bundled credential works with the password-only sign-in form."""

    config = load_config()
    auth = AuthManager(config.access)

    assert config.access.credentials
    assert config.access.credentials[0].identifier is None

    session = auth.authenticate("change-me")

    assert session.role == AccessRole.EDITOR
