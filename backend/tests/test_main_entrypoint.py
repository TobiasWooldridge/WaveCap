from __future__ import annotations

import pytest

from wavecap_backend import __main__ as main


def test_resolve_fixture_set_pass_through(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(main, "available_fixture_sets", lambda: ["alpha", "beta"])
    monkeypatch.setattr(main, "normalize_fixture_set_name", lambda name: name.lower())

    assert main._resolve_fixture_set(None) == ""
    assert main._resolve_fixture_set("") == ""
    assert main._resolve_fixture_set("Alpha") == "alpha"


def test_resolve_fixture_set_rejects_unknown(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(main, "available_fixture_sets", lambda: ["alpha", "beta"])
    monkeypatch.setattr(main, "normalize_fixture_set_name", lambda name: name.lower())

    with pytest.raises(SystemExit) as excinfo:
        main._resolve_fixture_set("gamma")

    assert "gamma" in str(excinfo.value)
