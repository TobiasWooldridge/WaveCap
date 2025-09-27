import asyncio
import inspect
import sys
from pathlib import Path
from types import SimpleNamespace
from typing import Iterator

import pytest

from wavecap_backend.models import AppConfig


class _FakeWhisperModel:
    def __init__(self, *_args, **_kwargs):
        pass


sys.modules.setdefault(
    "faster_whisper", SimpleNamespace(WhisperModel=_FakeWhisperModel)
)


def pytest_configure(config: pytest.Config) -> None:
    config.addinivalue_line(
        "markers", "asyncio: mark async tests to run in an event loop"
    )


@pytest.hookimpl(tryfirst=True)
def pytest_pyfunc_call(pyfuncitem: pytest.Function) -> bool | None:
    test_function = pyfuncitem.obj
    if not inspect.iscoroutinefunction(test_function):
        return None

    arg_names = pyfuncitem._fixtureinfo.argnames  # type: ignore[attr-defined]
    kwargs = {name: pyfuncitem.funcargs[name] for name in arg_names}
    coroutine = test_function(**kwargs)

    runner_cls = getattr(asyncio, "Runner", None)
    if runner_cls is not None:
        with runner_cls() as runner:  # type: ignore[call-arg]
            runner.run(coroutine)
    else:  # pragma: no cover - for Python versions without asyncio.Runner
        loop = asyncio.new_event_loop()
        try:
            asyncio.set_event_loop(loop)
            loop.run_until_complete(coroutine)
        finally:
            loop.run_until_complete(loop.shutdown_asyncgens())
            loop.close()
            asyncio.set_event_loop(None)
    return True


@pytest.fixture(autouse=True)
def isolate_state(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[Path]:
    from wavecap_backend import state_paths
    from wavecap_backend import stream_manager as stream_manager_module

    monkeypatch.setattr(state_paths, "STATE_DIR", tmp_path)
    monkeypatch.setattr(state_paths, "RECORDINGS_DIR", tmp_path / "recordings")
    monkeypatch.setattr(state_paths, "LOG_DIR", tmp_path / "logs")
    monkeypatch.setattr(
        stream_manager_module, "RECORDINGS_DIR", tmp_path / "recordings"
    )

    def _resolve(*parts: str) -> Path:
        return tmp_path.joinpath(*parts)

    monkeypatch.setattr(state_paths, "resolve_state_path", _resolve)

    from wavecap_backend import config as config_module

    monkeypatch.setattr(config_module, "resolve_state_path", _resolve)
    yield tmp_path


@pytest.fixture
def minimal_config() -> AppConfig:
    return AppConfig.model_validate(
        {
            "server": {
                "host": "0.0.0.0",
                "port": 8000,
                "corsOrigin": "http://localhost:5173",
            },
            "streams": [],
            "access": {
                "defaultRole": "read_only",
                "credentials": [
                    {
                        "identifier": "tester",
                        "password": "test-password",
                        "role": "editor",
                    }
                ],
            },
        }
    )
