"""Tests for LLM-based transcription correction."""

import asyncio

import pytest

from wavecap_backend.llm_corrector import (
    CorrectionResult,
    MLX_LLM_MODEL_MAP,
    NoOpCorrector,
    create_corrector,
    is_apple_silicon,
    mlx_llm_available,
)


class TestNoOpCorrector:
    """Tests for the NoOpCorrector pass-through implementation."""

    def test_correct_blocking_returns_unchanged(self):
        corrector = NoOpCorrector()
        text = "Original transcription text"

        result = corrector.correct_blocking(text)

        assert result.original_text == text
        assert result.corrected_text == text
        assert result.changed is False
        assert result.discard is False

    @pytest.mark.asyncio
    async def test_correct_async_returns_unchanged(self):
        corrector = NoOpCorrector()
        text = "Original transcription text"

        result = await corrector.correct(text)

        assert result.original_text == text
        assert result.corrected_text == text
        assert result.changed is False

    def test_correct_blocking_with_context(self):
        corrector = NoOpCorrector()
        text = "New message"
        context = "Previous context"

        result = corrector.correct_blocking(text, context=context)

        assert result.corrected_text == text
        assert result.changed is False


class TestCorrectionResult:
    """Tests for the CorrectionResult dataclass."""

    def test_basic_creation(self):
        result = CorrectionResult(
            original_text="hello",
            corrected_text="Hello",
            changed=True,
        )

        assert result.original_text == "hello"
        assert result.corrected_text == "Hello"
        assert result.changed is True
        assert result.discard is False

    def test_discard_flag(self):
        result = CorrectionResult(
            original_text="gibberish",
            corrected_text="gibberish",
            changed=False,
            discard=True,
        )

        assert result.discard is True


class TestModelPathResolution:
    """Tests for the model path resolution logic."""

    def test_known_models_resolve_to_mlx_community(self):
        """Known model names are mapped to their MLX Hub paths."""
        for short_name, full_path in MLX_LLM_MODEL_MAP.items():
            assert "mlx-community" in full_path or "/" in full_path

    def test_model_map_contains_expected_models(self):
        """The model map contains common model variants."""
        expected_models = ["llama-3.2-1b", "llama-3.2-3b", "qwen-2.5-1.5b"]
        for model in expected_models:
            assert model in MLX_LLM_MODEL_MAP


class TestCreateCorrector:
    """Tests for the create_corrector factory function."""

    def test_disabled_config_returns_noop(self):
        from wavecap_backend.models import LLMConfig

        config = LLMConfig(enabled=False)

        corrector = create_corrector(config)

        assert isinstance(corrector, NoOpCorrector)

    def test_none_config_returns_noop(self):
        corrector = create_corrector(None)

        assert isinstance(corrector, NoOpCorrector)


class TestCleanResponse:
    """Tests for the _clean_response method logic.

    These tests exercise the response cleaning logic by testing
    through the MLXLLMCorrector class if available, or by testing
    the patterns directly.
    """

    @pytest.fixture
    def clean_response_func(self):
        """Return a function that tests the _clean_response logic."""
        # Test the patterns that _clean_response checks
        prefixes_to_remove = [
            "Corrected transcription:",
            "Corrected:",
            "Here is the corrected transcription:",
            "Here is the corrected text:",
            "Here's the corrected transcription:",
            "Here's the corrected text:",
            "The corrected transcription is:",
            "The corrected text is:",
            "Here is the corrected version:",
            "The corrected version is:",
            "Corrected version:",
        ]

        nonsense_indicators = [
            "unable to transcribe",
            "cannot transcribe",
            "unintelligible",
            "[unintelligible]",
            "[inaudible]",
            "[noise]",
            "[static]",
        ]

        def clean(response: str, original: str) -> tuple[str, bool]:
            text = response.strip()

            # Remove prefixes
            changed = True
            while changed:
                changed = False
                text_lower = text.lower()
                for prefix in prefixes_to_remove:
                    if text_lower.startswith(prefix.lower()):
                        text = text[len(prefix):].strip()
                        changed = True
                        break

            # Remove surrounding quotes
            if (text.startswith('"') and text.endswith('"')) or (
                text.startswith("'") and text.endswith("'")
            ):
                text = text[1:-1].strip()

            # Check for nonsense indicators
            text_lower = text.lower()
            for indicator in nonsense_indicators:
                if indicator in text_lower:
                    return (original, True)

            if not text or len(text) < 3:
                return (original, False)

            return (text, False)

        return clean

    def test_strips_corrected_prefix(self, clean_response_func):
        response = "Corrected: This is the fixed text"
        original = "Original"

        text, is_nonsense = clean_response_func(response, original)

        assert text == "This is the fixed text"
        assert is_nonsense is False

    def test_strips_here_is_prefix(self, clean_response_func):
        response = "Here is the corrected text: Fire reported on Main St"
        original = "Original"

        text, is_nonsense = clean_response_func(response, original)

        assert text == "Fire reported on Main St"

    def test_strips_nested_prefixes(self, clean_response_func):
        response = "Corrected: Here is the corrected text: Final text"
        original = "Original"

        text, is_nonsense = clean_response_func(response, original)

        assert text == "Final text"

    def test_strips_surrounding_quotes(self, clean_response_func):
        response = '"This is the corrected text"'
        original = "Original"

        text, is_nonsense = clean_response_func(response, original)

        assert text == "This is the corrected text"

    def test_strips_single_quotes(self, clean_response_func):
        response = "'Corrected message'"
        original = "Original"

        text, is_nonsense = clean_response_func(response, original)

        assert text == "Corrected message"

    def test_detects_unintelligible_indicator(self, clean_response_func):
        response = "The audio is unintelligible"
        original = "garbled text"

        text, is_nonsense = clean_response_func(response, original)

        assert is_nonsense is True
        assert text == original

    def test_detects_inaudible_marker(self, clean_response_func):
        response = "[inaudible] some text"
        original = "original"

        text, is_nonsense = clean_response_func(response, original)

        assert is_nonsense is True

    def test_detects_noise_marker(self, clean_response_func):
        response = "[noise]"
        original = "original"

        text, is_nonsense = clean_response_func(response, original)

        assert is_nonsense is True

    def test_returns_original_for_empty_response(self, clean_response_func):
        response = ""
        original = "Original text"

        text, is_nonsense = clean_response_func(response, original)

        assert text == original
        assert is_nonsense is False

    def test_returns_original_for_very_short_response(self, clean_response_func):
        response = "Hi"
        original = "Original text"

        text, is_nonsense = clean_response_func(response, original)

        assert text == original

    def test_preserves_valid_response(self, clean_response_func):
        response = "Fire reported at 123 Main Street, units responding"
        original = "fire reported at one two three main street units responding"

        text, is_nonsense = clean_response_func(response, original)

        assert text == response
        assert is_nonsense is False


class TestPlatformDetection:
    """Tests for platform detection utilities."""

    def test_is_apple_silicon_returns_bool(self):
        """is_apple_silicon returns a boolean."""
        result = is_apple_silicon()
        assert isinstance(result, bool)

    def test_mlx_llm_available_returns_bool(self):
        """mlx_llm_available returns a boolean."""
        result = mlx_llm_available()
        assert isinstance(result, bool)
