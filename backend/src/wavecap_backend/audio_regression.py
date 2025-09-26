"""Audio regression evaluation helpers."""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Sequence

import numpy as np
import soundfile as sf

from .audio_processing import AudioFrontEndConfig, AudioFrontEndProcessor
from .whisper_transcriber import AbstractTranscriber

LOGGER = logging.getLogger(__name__)

REGRESSION_CASES_FILENAME = "cases.jsonl"
REGRESSION_AUDIO_SUBDIR = "audio"

_word_tokeniser = re.compile(r"[\w']+")


@dataclass(slots=True)
class RegressionCaseDefinition:
    """Serializable description of a regression case."""

    name: str
    audio: str
    expected_transcript: str
    transcription_id: Optional[str] = None
    stream_id: Optional[str] = None
    timestamp: Optional[str] = None
    duration: Optional[float] = None
    review_status: Optional[str] = None
    source_text: Optional[str] = None
    reviewed_at: Optional[str] = None
    reviewer: Optional[str] = None

    def to_payload(self) -> dict:
        payload = {
            "name": self.name,
            "audio": self.audio,
            "expected_transcript": self.expected_transcript,
        }
        if self.transcription_id is not None:
            payload["transcription_id"] = self.transcription_id
        if self.stream_id is not None:
            payload["stream_id"] = self.stream_id
        if self.timestamp is not None:
            payload["timestamp"] = self.timestamp
        if self.duration is not None:
            payload["duration"] = self.duration
        if self.review_status is not None:
            payload["review_status"] = self.review_status
        if self.source_text is not None:
            payload["source_text"] = self.source_text
        if self.reviewed_at is not None:
            payload["reviewed_at"] = self.reviewed_at
        if self.reviewer is not None:
            payload["reviewer"] = self.reviewer
        return payload

    def to_json(self) -> str:
        return json.dumps(self.to_payload(), ensure_ascii=False)

    @classmethod
    def from_payload(cls, payload: dict) -> "RegressionCaseDefinition":
        required = {"name", "audio", "expected_transcript"}
        missing = required.difference(payload)
        if missing:
            raise ValueError(f"Regression case missing required fields: {sorted(missing)}")
        return cls(
            name=str(payload["name"]),
            audio=str(payload["audio"]),
            expected_transcript=str(payload["expected_transcript"]),
            transcription_id=payload.get("transcription_id"),
            stream_id=payload.get("stream_id"),
            timestamp=payload.get("timestamp"),
            duration=payload.get("duration"),
            review_status=payload.get("review_status"),
            source_text=payload.get("source_text"),
            reviewed_at=payload.get("reviewed_at"),
            reviewer=payload.get("reviewer"),
        )

    def resolve(self, base_dir: Path) -> "RegressionCase":
        audio_path = Path(self.audio)
        if not audio_path.is_absolute():
            audio_path = (base_dir / audio_path).resolve()
        return RegressionCase(
            name=self.name,
            audio_path=audio_path,
            expected_transcript=self.expected_transcript,
            transcription_id=self.transcription_id,
            stream_id=self.stream_id,
            timestamp=self.timestamp,
            duration=self.duration,
            review_status=self.review_status,
            source_text=self.source_text,
            reviewed_at=self.reviewed_at,
            reviewer=self.reviewer,
        )


@dataclass(slots=True)
class RegressionCase:
    """Concrete regression case with resolved audio path."""

    name: str
    audio_path: Path
    expected_transcript: str
    transcription_id: Optional[str] = None
    stream_id: Optional[str] = None
    timestamp: Optional[str] = None
    duration: Optional[float] = None
    review_status: Optional[str] = None
    source_text: Optional[str] = None
    reviewed_at: Optional[str] = None
    reviewer: Optional[str] = None


@dataclass(slots=True)
class RegressionMetrics:
    """Detailed metrics for a regression evaluation."""

    reference: str
    hypothesis: str
    word_distance: int
    word_count: int
    char_distance: int
    char_count: int

    @property
    def word_error_rate(self) -> float:
        if self.word_count <= 0:
            return 0.0
        return float(self.word_distance) / float(self.word_count)

    @property
    def character_error_rate(self) -> float:
        if self.char_count <= 0:
            return 0.0
        return float(self.char_distance) / float(self.char_count)

    @property
    def exact_match(self) -> bool:
        return self.word_distance == 0 and self.char_distance == 0

    def to_report(self) -> dict:
        return {
            "reference": self.reference,
            "hypothesis": self.hypothesis,
            "word_error_rate": self.word_error_rate,
            "character_error_rate": self.character_error_rate,
            "word_count": self.word_count,
            "char_count": self.char_count,
        }

    @classmethod
    def from_texts(cls, reference: str, hypothesis: str) -> "RegressionMetrics":
        ref_norm = _normalise_text(reference)
        hyp_norm = _normalise_text(hypothesis)
        ref_tokens = _tokenise_words(ref_norm)
        hyp_tokens = _tokenise_words(hyp_norm)
        word_distance = _levenshtein_distance(ref_tokens, hyp_tokens)
        char_distance = _levenshtein_distance(list(ref_norm), list(hyp_norm))
        return cls(
            reference=reference,
            hypothesis=hypothesis,
            word_distance=word_distance,
            word_count=len(ref_tokens),
            char_distance=char_distance,
            char_count=len(ref_norm),
        )


@dataclass(slots=True)
class RegressionResult:
    """Outcome for a single regression case."""

    case: RegressionCase
    transcript: str
    metrics: RegressionMetrics

    def to_report(self) -> dict:
        payload = {
            "name": self.case.name,
            "transcript": self.transcript,
            "metrics": self.metrics.to_report(),
            "expected_transcript": self.case.expected_transcript,
        }
        if self.case.transcription_id is not None:
            payload["transcription_id"] = self.case.transcription_id
        if self.case.stream_id is not None:
            payload["stream_id"] = self.case.stream_id
        if self.case.timestamp is not None:
            payload["timestamp"] = self.case.timestamp
        if self.case.duration is not None:
            payload["duration"] = self.case.duration
        if self.case.review_status is not None:
            payload["review_status"] = self.case.review_status
        if self.case.reviewed_at is not None:
            payload["reviewed_at"] = self.case.reviewed_at
        if self.case.reviewer is not None:
            payload["reviewer"] = self.case.reviewer
        return payload


@dataclass(slots=True)
class RegressionSummary:
    """Aggregate metrics for a regression corpus."""

    results: Sequence[RegressionResult]

    @property
    def case_count(self) -> int:
        return len(self.results)

    @property
    def average_word_error_rate(self) -> float:
        total_distance = sum(result.metrics.word_distance for result in self.results)
        total_words = sum(result.metrics.word_count for result in self.results)
        if total_words <= 0:
            return 0.0
        return float(total_distance) / float(total_words)

    @property
    def average_character_error_rate(self) -> float:
        total_distance = sum(result.metrics.char_distance for result in self.results)
        total_chars = sum(result.metrics.char_count for result in self.results)
        if total_chars <= 0:
            return 0.0
        return float(total_distance) / float(total_chars)

    @property
    def exact_match_rate(self) -> float:
        if not self.results:
            return 0.0
        matches = sum(1 for result in self.results if result.metrics.exact_match)
        return float(matches) / float(len(self.results))

    def to_report(self) -> dict:
        return {
            "cases": self.case_count,
            "average_word_error_rate": self.average_word_error_rate,
            "average_character_error_rate": self.average_character_error_rate,
            "exact_match_rate": self.exact_match_rate,
            "results": [result.to_report() for result in self.results],
        }


def load_case_definitions(path: Path) -> List[RegressionCaseDefinition]:
    """Load regression case definitions from JSON or JSONL."""

    if not path.exists():
        raise FileNotFoundError(f"Regression case file not found: {path}")
    if path.suffix == ".jsonl":
        definitions = []
        with path.open("r", encoding="utf-8") as handle:
            for line_number, line in enumerate(handle, start=1):
                stripped = line.strip()
                if not stripped:
                    continue
                try:
                    payload = json.loads(stripped)
                except json.JSONDecodeError as exc:
                    raise ValueError(
                        f"Invalid JSON on line {line_number} of {path}: {exc}"
                    ) from exc
                definitions.append(RegressionCaseDefinition.from_payload(payload))
        return definitions
    if path.suffix == ".json":
        payload = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(payload, list):
            raise ValueError("JSON regression case files must contain a list of cases")
        return [RegressionCaseDefinition.from_payload(item) for item in payload]
    raise ValueError("Regression case files must use .json or .jsonl extensions")


def dump_case_definitions(
    cases: Sequence[RegressionCaseDefinition], path: Path
) -> None:
    """Write regression case definitions to disk as JSONL."""

    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for case in cases:
            handle.write(case.to_json())
            handle.write("\n")


def load_regression_cases(path: Path) -> List[RegressionCase]:
    """Resolve regression cases from a definition file."""

    base_dir = path.parent
    definitions = load_case_definitions(path)
    return [definition.resolve(base_dir) for definition in definitions]


def generate_case_name(
    *,
    stream_id: Optional[str],
    timestamp: Optional[str],
    fallback: str,
    used_names: Optional[set[str]] = None,
) -> str:
    """Generate a filesystem-safe, unique case name."""

    components: List[str] = []
    if stream_id:
        components.append(str(stream_id))
    if timestamp:
        components.append(str(timestamp).replace(":", "").replace(" ", "T"))
    base = "-".join(components) if components else fallback
    sanitized = re.sub(r"[^A-Za-z0-9._-]", "-", base).strip("-")
    if not sanitized:
        sanitized = re.sub(r"[^A-Za-z0-9._-]", "-", fallback).strip("-") or "case"
    if used_names is None:
        return sanitized
    candidate = sanitized
    suffix = 1
    while candidate in used_names:
        candidate = f"{sanitized}-{suffix}"
        suffix += 1
    used_names.add(candidate)
    return candidate


def evaluate_case(
    case: RegressionCase,
    transcriber: AbstractTranscriber,
    *,
    sample_rate: int,
    language: Optional[str],
    frontend_config: AudioFrontEndConfig,
    agc_target_rms: Optional[float] = None,
) -> RegressionResult:
    """Transcribe ``case`` and compute evaluation metrics."""

    audio, source_rate = sf.read(case.audio_path, dtype="float32", always_2d=False)
    if audio.ndim > 1:
        audio = audio.mean(axis=1)
    if source_rate != sample_rate:
        audio = _resample_audio(audio, source_rate, sample_rate)
    processor = AudioFrontEndProcessor(frontend_config)
    processed = processor.process(audio, target_rms=agc_target_rms)
    bundle = transcriber.transcribe_blocking(processed, sample_rate, language)
    metrics = RegressionMetrics.from_texts(case.expected_transcript, bundle.text)
    return RegressionResult(case=case, transcript=bundle.text, metrics=metrics)


def evaluate_corpus(
    cases: Sequence[RegressionCase],
    transcriber: AbstractTranscriber,
    *,
    sample_rate: int,
    language: Optional[str],
    frontend_config: AudioFrontEndConfig,
    agc_target_rms: Optional[float] = None,
) -> RegressionSummary:
    """Run the regression suite and summarise the results."""

    results: List[RegressionResult] = []
    for case in cases:
        try:
            results.append(
                evaluate_case(
                    case,
                    transcriber,
                    sample_rate=sample_rate,
                    language=language,
                    frontend_config=frontend_config,
                    agc_target_rms=agc_target_rms,
                )
            )
        except FileNotFoundError:
            LOGGER.warning("Audio file missing for case %s", case.name)
        except Exception as exc:  # pragma: no cover - defensive logging
            LOGGER.exception("Failed to evaluate regression case %s", case.name)
            raise exc
    return RegressionSummary(results)


def _normalise_text(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"\s+", " ", value)
    return value


def _tokenise_words(value: str) -> List[str]:
    return _word_tokeniser.findall(value)


def _levenshtein_distance(a: Sequence[str], b: Sequence[str]) -> int:
    if not a:
        return len(b)
    if not b:
        return len(a)
    previous = list(range(len(b) + 1))
    for i, token in enumerate(a, start=1):
        current = [i]
        for j, other in enumerate(b, start=1):
            substitution = previous[j - 1]
            if token != other:
                substitution += 1
            insertion = previous[j] + 1
            deletion = current[j - 1] + 1
            current.append(min(substitution, insertion, deletion))
        previous = current
    return previous[-1]


def _resample_audio(audio: np.ndarray, source_rate: int, target_rate: int) -> np.ndarray:
    if source_rate == target_rate or audio.size == 0:
        return audio.astype(np.float32, copy=False)
    duration = float(audio.shape[0]) / float(source_rate)
    target_length = max(int(round(duration * float(target_rate))), 1)
    if target_length == audio.shape[0]:
        return audio.astype(np.float32, copy=False)
    source_times = np.linspace(0.0, duration, num=audio.shape[0], endpoint=False)
    target_times = np.linspace(0.0, duration, num=target_length, endpoint=False)
    resampled = np.interp(target_times, source_times, audio)
    return resampled.astype(np.float32, copy=False)


__all__ = [
    "REGRESSION_CASES_FILENAME",
    "REGRESSION_AUDIO_SUBDIR",
    "RegressionCaseDefinition",
    "RegressionCase",
    "RegressionMetrics",
    "RegressionResult",
    "RegressionSummary",
    "generate_case_name",
    "load_case_definitions",
    "dump_case_definitions",
    "load_regression_cases",
    "evaluate_case",
    "evaluate_corpus",
]
