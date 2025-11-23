"""Configuration loading utilities."""

from __future__ import annotations

import re
import secrets
from pathlib import Path
from typing import Any, Dict, Iterable, List

import yaml

from .models import AppConfig, AlertsConfig, LoggingConfig
from .state_paths import PROJECT_ROOT, resolve_state_path

DEFAULT_CONFIG_PATH = PROJECT_ROOT / "backend" / "default-config.yaml"

_CONFIG_SCAFFOLD = (
    "# Override settings from backend/default-config.yaml here.\n"
    "# Provide YAML overrides that match the shipped structure.\n"
    "# This file is ignored by source control.\n"
)

_WEBHOOK_PLACEHOLDER_PATTERN = re.compile(r"^(\s*webhookToken:\s*)(replace-me)\s*$", re.MULTILINE)
_PASSWORD_PLACEHOLDER_PATTERN = re.compile(r"^(\s*password:\s*)(change-me)\s*$", re.MULTILINE)


def _generate_webhook_token() -> str:
    return secrets.token_urlsafe(32)


def _generate_password() -> str:
    return secrets.token_urlsafe(18)


def _load_default_config_template() -> str:
    try:
        return DEFAULT_CONFIG_PATH.read_text()
    except OSError:  # pragma: no cover - fallback when defaults are missing
        return _CONFIG_SCAFFOLD


def _personalize_config_template(template: str) -> str:
    def replace_webhook(match: re.Match[str]) -> str:
        return f"{match.group(1)}{_generate_webhook_token()}"

    def replace_password(match: re.Match[str]) -> str:
        return f"{match.group(1)}{_generate_password()}"

    updated = _WEBHOOK_PLACEHOLDER_PATTERN.sub(replace_webhook, template)
    updated = _PASSWORD_PLACEHOLDER_PATTERN.sub(replace_password, updated)
    return updated


def _ensure_user_config_scaffold() -> None:
    """Create ``state/config.yaml`` when missing, copying defaults and rotating secrets."""

    yaml_path = resolve_state_path("config.yaml")
    if yaml_path.exists():
        return

    yaml_path.parent.mkdir(parents=True, exist_ok=True)

    template = _load_default_config_template()
    personalised = _personalize_config_template(template)
    yaml_path.write_text(personalised)


def _read_config(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {}

    if path.suffix not in {".yaml", ".yml"}:
        raise ValueError(f"Unsupported configuration format: {path}")

    try:
        loaded = yaml.safe_load(path.read_text())
    except yaml.YAMLError as exc:  # pragma: no cover - defensive
        raise ValueError(f"Unable to parse configuration file: {path}") from exc

    if loaded is None:
        return {}
    if not isinstance(loaded, dict):
        raise ValueError(f"Configuration file must contain a mapping: {path}")
    return loaded


def _merge_logging(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    result = {**base}
    backend = {**base.get("backend", {})}
    backend.update(override.get("backend", {}))
    frontend = {**base.get("frontend", {})}
    frontend.update(override.get("frontend", {}))
    result.update(override)
    if backend:
        result["backend"] = backend
    if frontend:
        result["frontend"] = frontend
    return result


def _merge_alerts(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    result = {**base, **override}
    if "rules" in override:
        result["rules"] = override["rules"]
    return result


def _merge_configs(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    merged = {**base, **override}
    if "server" in base or "server" in override:
        merged["server"] = {**base.get("server", {}), **override.get("server", {})}
    if "whisper" in base or "whisper" in override:
        merged["whisper"] = {**base.get("whisper", {}), **override.get("whisper", {})}
    if "logging" in base or "logging" in override:
        merged["logging"] = _merge_logging(
            base.get("logging", {}), override.get("logging", {})
        )
    if "alerts" in base or "alerts" in override:
        merged["alerts"] = _merge_alerts(
            base.get("alerts", {}), override.get("alerts", {})
        )
    if "ui" in base or "ui" in override:
        merged["ui"] = {**base.get("ui", {}), **override.get("ui", {})}

    override_streams = None
    if "streams" in override:
        override_streams = override.get("streams")
    elif "defaultStreams" in override:
        override_streams = override.get("defaultStreams")

    base_streams = None
    if "streams" in base:
        base_streams = base.get("streams")
    elif "defaultStreams" in base:
        base_streams = base.get("defaultStreams")

    if override_streams is not None:
        merged["streams"] = list(_ensure_stream_list(override_streams))
    elif base_streams is not None:
        merged["streams"] = list(_ensure_stream_list(base_streams))
    if "combinedStreamViews" in override:
        merged["combinedStreamViews"] = list(
            _ensure_view_list(override.get("combinedStreamViews"))
        )
    elif "combinedStreamViews" in base:
        merged["combinedStreamViews"] = list(
            _ensure_view_list(base.get("combinedStreamViews"))
        )
    return merged


def _ensure_stream_list(value: Any) -> List[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    raise TypeError("streams must be provided as a list when overriding configuration")


def _ensure_view_list(value: Any) -> List[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    raise TypeError(
        "combinedStreamViews must be provided as a list when overriding configuration"
    )


def _existing_config_paths(candidates: Iterable[Path]) -> List[Path]:
    return [path for path in candidates if path.exists()]


def load_config() -> AppConfig:
    """Load the effective application configuration."""

    _ensure_user_config_scaffold()

    default_candidates = _existing_config_paths([DEFAULT_CONFIG_PATH])
    state_defaults = _existing_config_paths([resolve_state_path("default-config.yaml")])
    user_configs = _existing_config_paths([resolve_state_path("config.yaml")])

    config_paths = [*default_candidates, *state_defaults, *user_configs]
    if not config_paths:
        raise FileNotFoundError(
            "No configuration files found. Ensure backend/default-config.yaml exists or provide state/config.yaml."
        )

    config_sources = [_read_config(path) for path in config_paths]

    merged: Dict[str, Any] = config_sources[0]
    for override in config_sources[1:]:
        merged = _merge_configs(merged, override)

    app_config = AppConfig.model_validate(merged)
    return app_config


def ensure_logging_directories(config: AppConfig) -> None:
    from .state_paths import LOG_DIR

    LOG_DIR.mkdir(parents=True, exist_ok=True)
    if config.logging.enabled:
        for target in (config.logging.backend, config.logging.frontend):
            if target.enabled and target.clearOnStart:
                log_path = LOG_DIR / target.fileName
                if log_path.exists():
                    log_path.unlink()


def serialize_config(config: AppConfig) -> Dict[str, Any]:
    data = config.model_dump(by_alias=True)
    return data


__all__ = ["load_config", "ensure_logging_directories", "serialize_config"]
