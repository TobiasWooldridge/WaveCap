from pathlib import Path
import numpy as np
import soundfile as sf
from types import SimpleNamespace

from wavecap_backend.audio_processing import AudioFrontEndConfig
from wavecap_backend.audio_regression import (
    REGRESSION_CASES_FILENAME,
    RegressionCase,
    RegressionCaseDefinition,
    RegressionMetrics,
    RegressionResult,
    RegressionSummary,
    dump_case_definitions,
    evaluate_case,
    generate_case_name,
    load_regression_cases,
)


class _StubTranscriber:
    def __init__(self, transcript: str):
        self._transcript = transcript

    def transcribe_blocking(self, audio, sample_rate, language):  # pragma: no cover - signature compatibility
        return SimpleNamespace(text=self._transcript)


def test_dump_and_load_cases(tmp_path):
    definition = RegressionCaseDefinition(
        name="example",
        audio="audio/example.wav",
        expected_transcript="hello world",
        transcription_id="abc",
        stream_id="stream-1",
    )
    manifest = tmp_path / REGRESSION_CASES_FILENAME
    dump_case_definitions([definition], manifest)
    loaded = load_regression_cases(manifest)
    assert len(loaded) == 1
    case = loaded[0]
    assert case.name == "example"
    assert case.transcription_id == "abc"
    assert case.audio_path == manifest.parent / definition.audio


def test_generate_case_name_uniqueness():
    used: set[str] = set()
    first = generate_case_name(
        stream_id="alpha",
        timestamp="2024-03-01T12:34:00Z",
        fallback="fallback",
        used_names=used,
    )
    second = generate_case_name(
        stream_id="alpha",
        timestamp="2024-03-01T12:34:00Z",
        fallback="fallback",
        used_names=used,
    )
    assert first != second
    assert first.startswith("alpha-")
    assert second.startswith("alpha-")


def test_regression_metrics_from_texts():
    metrics = RegressionMetrics.from_texts("hello world", "hello there world")
    assert metrics.word_count == 2
    assert metrics.word_distance == 1
    assert metrics.word_error_rate == 0.5
    assert not metrics.exact_match


def test_evaluate_case_handles_resampling(tmp_path):
    sample_rate = 16000
    frontend_config = AudioFrontEndConfig(sample_rate=sample_rate)
    audio_path = tmp_path / "clip.wav"
    tone = np.sin(np.linspace(0, np.pi * 4, 8000, dtype=np.float32))
    sf.write(audio_path, tone, 8000)
    case = RegressionCase(name="case-1", audio_path=audio_path, expected_transcript="test")
    transcriber = _StubTranscriber("test")
    result = evaluate_case(
        case,
        transcriber,
        sample_rate=sample_rate,
        language="en",
        frontend_config=frontend_config,
    )
    assert result.metrics.exact_match


def test_regression_summary_aggregates():
    case = RegressionCase(name="case", audio_path=Path("/tmp/audio.wav"), expected_transcript="ref")
    metrics_one = RegressionMetrics.from_texts("one two", "one")
    metrics_two = RegressionMetrics.from_texts("alpha", "alpha")
    results = [
        RegressionResult(case=case, transcript="one", metrics=metrics_one),
        RegressionResult(case=case, transcript="alpha", metrics=metrics_two),
    ]
    summary = RegressionSummary(results)
    assert summary.case_count == 2
    assert summary.average_word_error_rate == (
        metrics_one.word_distance + metrics_two.word_distance
    ) / (metrics_one.word_count + metrics_two.word_count)
    assert summary.exact_match_rate == 0.5
