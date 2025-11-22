"""LLM-based transcription correction using MLX on Apple Silicon."""

from __future__ import annotations

import asyncio
import logging
import platform
import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any, Optional, Tuple

if TYPE_CHECKING:
    from .models import LLMConfig

LOGGER = logging.getLogger(__name__)

# Try to import MLX LLM libraries
try:
    from mlx_lm import load, generate

    mlx_lm_available = True
except ImportError:
    mlx_lm_available = False
    load = None
    generate = None


# Model name to MLX Hub repo mapping
MLX_LLM_MODEL_MAP = {
    # Small, fast models for real-time correction
    "llama-3.2-1b": "mlx-community/Llama-3.2-1B-Instruct-4bit",
    "llama-3.2-3b": "mlx-community/Llama-3.2-3B-Instruct-4bit",
    "qwen-2.5-1.5b": "mlx-community/Qwen2.5-1.5B-Instruct-4bit",
    "qwen-2.5-3b": "mlx-community/Qwen2.5-3B-Instruct-4bit",
    # Medium models for background processing
    "llama-3.2-8b": "mlx-community/Llama-3.2-8B-Instruct-4bit",
    "qwen-2.5-7b": "mlx-community/Qwen2.5-7B-Instruct-4bit",
    # Larger models for high-quality correction
    "llama-3.1-8b": "mlx-community/Meta-Llama-3.1-8B-Instruct-4bit",
    "deepseek-r1-8b": "mlx-community/DeepSeek-R1-Distill-Llama-8B-4bit",
}

DEFAULT_SYSTEM_PROMPT = """You are correcting radio transcriptions from South Australia emergency services dispatch.

Your task:
1. Fix obvious transcription errors (mishearings, repeated words)
2. Add proper punctuation and capitalization
3. Preserve the original meaning - do not add or remove information
4. Keep domain-specific terms accurate

Common terms that may be misheard:
- "SITREP" (situation report)
- Unit callsigns (e.g., "Metro 2-1", "Noarlunga 3", "Sturt 1")
- Map references (e.g., "Map 147 D4")
- "Roger", "Copy", "Over", "Out"

Adelaide/SA specific terms:
- "Adelaide fire out" - common sign-off phrase, usually at end of transmissions
- Suburb names: Noarlunga, Aldinga, Para Hills, Gawler, Sturt, Modbury, Elizabeth, Salisbury, Port Adelaide, Henley Beach, Glenelg, Marion, Mitcham
- Services: SAPOL (SA Police), SES (State Emergency Service), CFS (Country Fire Service), MFS (Metropolitan Fire Service), SAAS (SA Ambulance Service)

Return ONLY the corrected text with no explanation or commentary."""


@dataclass
class CorrectionResult:
    """Result of LLM correction."""

    original_text: str
    corrected_text: str
    changed: bool
    discard: bool = False  # True if the transcription should be discarded as nonsense


class AbstractLLMCorrector(ABC):
    """Abstract base class for LLM-based transcription correction."""

    @abstractmethod
    async def correct(
        self,
        text: str,
        *,
        context: Optional[str] = None,
    ) -> CorrectionResult:
        """Correct transcription text using LLM."""
        ...

    @abstractmethod
    def correct_blocking(
        self,
        text: str,
        *,
        context: Optional[str] = None,
    ) -> CorrectionResult:
        """Blocking version of correct."""
        ...


class MLXLLMCorrector(AbstractLLMCorrector):
    """LLM corrector using MLX for Apple Silicon."""

    def __init__(self, config: "LLMConfig", *, preload_model: bool = True):
        if not mlx_lm_available:
            raise RuntimeError(
                "mlx-lm is not installed. Install with: pip install mlx-lm"
            )
        self.config = config
        self._model_path = self._resolve_model_path(config.model)
        self._model = None
        self._tokenizer = None
        self._lock = threading.Lock()
        self._semaphore = threading.Semaphore(config.maxConcurrentRequests)

        # Build system prompt
        self._system_prompt = config.systemPrompt or DEFAULT_SYSTEM_PROMPT
        if config.domainTerms:
            terms_list = "\n".join(f"- {term}" for term in config.domainTerms)
            self._system_prompt += f"\n\nAdditional domain terms:\n{terms_list}"

        if preload_model:
            LOGGER.info("Loading MLX LLM model %s from %s", config.model, self._model_path)
            self._load_model()

    @staticmethod
    def _resolve_model_path(model_name: str) -> str:
        """Map standard model names to MLX Hub repo paths."""
        if model_name in MLX_LLM_MODEL_MAP:
            return MLX_LLM_MODEL_MAP[model_name]
        # If not in map, assume it's already a full path/repo
        if "/" in model_name:
            return model_name
        # Try mlx-community prefix
        return f"mlx-community/{model_name}"

    def _load_model(self) -> None:
        """Load the model and tokenizer."""
        with self._lock:
            if self._model is not None:
                return
            try:
                self._model, self._tokenizer = load(self._model_path)
                LOGGER.info("MLX LLM model %s loaded successfully", self.config.model)
            except Exception as exc:
                LOGGER.error("Failed to load MLX LLM model: %s", exc)
                raise

    def _ensure_model_loaded(self) -> None:
        """Ensure model is loaded before inference."""
        if self._model is None:
            self._load_model()

    def _build_prompt(self, text: str, context: Optional[str] = None) -> str:
        """Build the full prompt for correction."""
        messages = [{"role": "system", "content": self._system_prompt}]

        if context:
            messages.append(
                {"role": "user", "content": f"Previous context: {context}"}
            )
            messages.append(
                {"role": "assistant", "content": "I'll keep that context in mind."}
            )

        messages.append({"role": "user", "content": f"Correct this transcription:\n\n{text}"})

        # Apply chat template if tokenizer supports it
        if hasattr(self._tokenizer, "apply_chat_template"):
            return self._tokenizer.apply_chat_template(
                messages, tokenize=False, add_generation_prompt=True
            )

        # Fallback: simple format
        prompt_parts = []
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            if role == "system":
                prompt_parts.append(f"System: {content}")
            elif role == "user":
                prompt_parts.append(f"User: {content}")
            elif role == "assistant":
                prompt_parts.append(f"Assistant: {content}")
        prompt_parts.append("Assistant:")
        return "\n\n".join(prompt_parts)

    async def correct(
        self,
        text: str,
        *,
        context: Optional[str] = None,
    ) -> CorrectionResult:
        """Correct transcription text using LLM."""
        return await asyncio.to_thread(self.correct_blocking, text, context=context)

    def correct_blocking(
        self,
        text: str,
        *,
        context: Optional[str] = None,
    ) -> CorrectionResult:
        """Blocking version of correct."""
        # Skip very short texts
        if len(text.strip()) < self.config.minTextLength:
            return CorrectionResult(
                original_text=text, corrected_text=text, changed=False
            )

        self._ensure_model_loaded()

        with self._semaphore:
            prompt = self._build_prompt(text, context)
            LOGGER.debug("Running MLX LLM correction on %d chars", len(text))

            try:
                response = generate(
                    self._model,
                    self._tokenizer,
                    prompt=prompt,
                    max_tokens=self.config.maxTokens,
                    temp=self.config.temperature,
                    verbose=False,
                )

                # Clean up response
                corrected, is_nonsense = self._clean_response(response, text)

                # If LLM detected nonsense, mark for discarding
                if is_nonsense:
                    return CorrectionResult(
                        original_text=text,
                        corrected_text=text,
                        changed=False,
                        discard=True,
                    )

                # Check if actually changed
                changed = corrected.strip().lower() != text.strip().lower()

                return CorrectionResult(
                    original_text=text,
                    corrected_text=corrected,
                    changed=changed,
                )

            except Exception as exc:
                LOGGER.warning("LLM correction failed: %s", exc)
                return CorrectionResult(
                    original_text=text, corrected_text=text, changed=False
                )

    def _clean_response(self, response: str, original: str) -> Tuple[str, bool]:
        """Clean LLM response to extract just the corrected text.

        Returns (cleaned_text, is_nonsense) where is_nonsense=True means
        the LLM detected the original as unintelligible/noise.
        """
        text = response.strip()

        # Remove common prefixes
        prefixes_to_remove = [
            "Corrected transcription:",
            "Corrected:",
            "Here is the corrected text:",
            "Here's the corrected transcription:",
        ]
        for prefix in prefixes_to_remove:
            if text.lower().startswith(prefix.lower()):
                text = text[len(prefix) :].strip()

        # Remove quotes if the entire response is quoted
        if (text.startswith('"') and text.endswith('"')) or (
            text.startswith("'") and text.endswith("'")
        ):
            text = text[1:-1].strip()

        # If response is much longer than original, it might have explanations
        # In that case, try to extract just the first line/sentence
        if len(text) > len(original) * 2:
            lines = text.split("\n")
            if lines:
                text = lines[0].strip()

        # Check for nonsense indicators - LLM saying the text is unintelligible
        nonsense_indicators = [
            "unable to transcribe",
            "cannot transcribe",
            "unintelligible",
            "not intelligible",
            "cannot be corrected",
            "no meaningful",
            "no clear",
            "unclear audio",
            "cannot understand",
            "not understandable",
            "[noise]",
            "[static]",
            "[unintelligible]",
            "[inaudible]",
            "inaudible",
            "no transcription",
            "cannot correct",
            "nothing to correct",
        ]
        text_lower = text.lower()
        for indicator in nonsense_indicators:
            if indicator in text_lower:
                LOGGER.debug("LLM detected nonsense: %r -> %r", original, text)
                return (original, True)

        # Fallback to original if response is empty or nonsensical
        if not text or len(text) < 3:
            return (original, False)

        return (text, False)


class NoOpCorrector(AbstractLLMCorrector):
    """No-op corrector that returns text unchanged."""

    async def correct(
        self,
        text: str,
        *,
        context: Optional[str] = None,
    ) -> CorrectionResult:
        return CorrectionResult(original_text=text, corrected_text=text, changed=False)

    def correct_blocking(
        self,
        text: str,
        *,
        context: Optional[str] = None,
    ) -> CorrectionResult:
        return CorrectionResult(original_text=text, corrected_text=text, changed=False)


def is_apple_silicon() -> bool:
    """Check if running on Apple Silicon."""
    return platform.system() == "Darwin" and platform.machine() == "arm64"


def mlx_llm_available() -> bool:
    """Check if MLX LLM is available."""
    return mlx_lm_available and is_apple_silicon()


def create_corrector(
    config: Optional["LLMConfig"], *, preload_model: bool = True
) -> AbstractLLMCorrector:
    """Factory function to create the appropriate corrector based on config."""
    if config is None or not config.enabled:
        LOGGER.info("LLM correction disabled")
        return NoOpCorrector()

    if not mlx_llm_available():
        LOGGER.warning(
            "MLX LLM not available (requires Apple Silicon with mlx-lm installed), "
            "falling back to no-op corrector"
        )
        return NoOpCorrector()

    try:
        return MLXLLMCorrector(config, preload_model=preload_model)
    except Exception as exc:
        LOGGER.error("Failed to create MLX LLM corrector: %s", exc)
        return NoOpCorrector()
