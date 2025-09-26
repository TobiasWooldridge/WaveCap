"""Run the audio regression suite against the configured Whisper model."""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Optional

from wavecap_backend.audio_processing import AudioFrontEndConfig
from wavecap_backend.audio_regression import (
    REGRESSION_CASES_FILENAME,
    RegressionSummary,
    evaluate_corpus,
    load_regression_cases,
)
from wavecap_backend.config import load_config
from wavecap_backend.whisper_transcriber import WhisperTranscriber

LOGGER = logging.getLogger(__name__)


def _resolve_cases_path(path: Path) -> Path:
    if path.is_dir():
        return path / REGRESSION_CASES_FILENAME
    return path


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--cases",
        type=Path,
        default=Path("backend/audio_regression") / REGRESSION_CASES_FILENAME,
        help="Path to a regression case file or directory",
    )
    parser.add_argument(
        "--language",
        type=str,
        default=None,
        help="Override the language hint passed to Whisper",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=None,
        help="Override the Whisper model checkpoint",
    )
    parser.add_argument(
        "--save-report",
        type=Path,
        default=None,
        help="Optional path where the JSON regression report will be written",
    )
    parser.add_argument(
        "--no-agc",
        action="store_true",
        help="Disable automatic gain control before transcription",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug logging",
    )
    return parser


def _build_frontend_config(whisper_sample_rate: int, config) -> AudioFrontEndConfig:
    deemphasis = (
        None
        if config.deemphasisTimeConstantMicros is None
        else float(config.deemphasisTimeConstantMicros) * 1e-6
    )
    return AudioFrontEndConfig(
        sample_rate=int(whisper_sample_rate),
        highpass_cutoff_hz=config.highpassCutoffHz,
        lowpass_cutoff_hz=config.lowpassCutoffHz,
        deemphasis_time_constant=deemphasis,
        agc_target_rms=None,
    )


def _print_summary(summary: RegressionSummary) -> None:
    if not summary.results:
        LOGGER.warning("No regression cases were evaluated")
        return
    LOGGER.info("Evaluated %s cases", summary.case_count)
    LOGGER.info("Average WER: %.3f", summary.average_word_error_rate)
    LOGGER.info("Average CER: %.3f", summary.average_character_error_rate)
    LOGGER.info("Exact match rate: %.3f", summary.exact_match_rate)



def main(argv: Optional[list[str]] = None) -> None:
    parser = build_arg_parser()
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO)

    cases_path = _resolve_cases_path(args.cases)
    LOGGER.info("Loading regression cases from %s", cases_path)
    cases = load_regression_cases(cases_path)
    if not cases:
        LOGGER.warning("No regression cases defined in %s", cases_path)
        return

    app_config = load_config()
    whisper_config = app_config.whisper.model_copy(deep=True)
    if args.model:
        whisper_config.model = args.model
    if args.language:
        whisper_config.language = args.language

    LOGGER.info("Loading Whisper checkpoint %s", whisper_config.model)
    transcriber = WhisperTranscriber(whisper_config)

    frontend_config = _build_frontend_config(whisper_config.sampleRate, whisper_config)
    agc_target = None if args.no_agc else whisper_config.agcTargetRms

    summary = evaluate_corpus(
        cases,
        transcriber,
        sample_rate=whisper_config.sampleRate,
        language=whisper_config.language,
        frontend_config=frontend_config,
        agc_target_rms=agc_target,
    )
    _print_summary(summary)

    if args.save_report:
        report_path = args.save_report
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(summary.to_report(), indent=2), encoding="utf-8")
        LOGGER.info("Wrote regression report to %s", report_path)


if __name__ == "__main__":  # pragma: no cover - manual execution entry point
    main()
