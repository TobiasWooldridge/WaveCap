"""Utilities that adjust Whisper text output."""

from __future__ import annotations

import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Iterable, List, Match, Optional, Tuple


WORD_PATTERN = re.compile(r"\b[\w']+\b")
SENTENCE_END_PUNCTUATION = frozenset(".?!")
SENTENCE_SUFFIX_TRAILERS = frozenset({"\"", "'", "”", "’", ")", ">", "]", "}"})


@dataclass(frozen=True)
class CanonicalPhrase:
    """Phrase replacement rule."""

    canonical: str
    threshold: float
    token_override: Optional[Tuple[str, ...]] = None
    suffix_only: bool = False

    @property
    def lower(self) -> str:
        return self.canonical.lower()

    @property
    def tokens(self) -> Tuple[str, ...]:
        if self.token_override is not None:
            return tuple(token.lower() for token in self.token_override)
        return tuple(self.lower.split())


class PhraseCanonicalizer:
    """Fuzzy replacement for key domain phrases."""

    def __init__(self, phrases: Iterable[CanonicalPhrase]):
        self._phrases: Tuple[CanonicalPhrase, ...] = tuple(phrases)

    @classmethod
    def with_default_phrases(cls) -> "PhraseCanonicalizer":
        return cls(
            (
                CanonicalPhrase("Adelaide fire out", 0.8),
                CanonicalPhrase("Adelaide", 0.78),
                CanonicalPhrase("Noarlunga", 0.78),
                CanonicalPhrase("SITREP", 0.78),
                CanonicalPhrase("SITREP", 0.88, ("sit", "rep")),
                CanonicalPhrase("Over", 0.85, suffix_only=True),
                CanonicalPhrase("Over and out", 0.85, suffix_only=True),
                CanonicalPhrase("Out", 0.83, suffix_only=True),
            )
        )

    def canonicalize(self, text: str) -> str:
        if not text:
            return text

        matches = list(WORD_PATTERN.finditer(text))
        if not matches:
            return text

        words = [match.group() for match in matches]
        word_count = len(words)

        candidates: List[Tuple[int, int, float, CanonicalPhrase]] = []
        for phrase in self._phrases:
            window = len(phrase.tokens)
            if window == 0 or window > word_count:
                continue
            target = phrase.lower
            for start in range(0, word_count - window + 1):
                slice_words = words[start : start + window]
                joined = " ".join(word.lower() for word in slice_words)
                ratio = SequenceMatcher(None, joined, target).ratio()
                if ratio >= phrase.threshold:
                    if phrase.suffix_only and not self._is_sentence_suffix(
                        text, matches, start + window
                    ):
                        continue
                    candidates.append((start, start + window, ratio, phrase))

        if not candidates:
            return text

        candidates.sort(key=lambda item: (-item[2], item[0], -(item[1] - item[0])))
        used = [False] * word_count
        replacements: List[Tuple[int, int, str]] = []
        for start, end, _score, phrase in candidates:
            if any(used[index] for index in range(start, end)):
                continue
            span_start = matches[start].start()
            span_end = matches[end - 1].end()
            replacements.append((span_start, span_end, phrase.canonical))
            for index in range(start, end):
                used[index] = True

        if not replacements:
            return text

        replacements.sort(key=lambda item: item[0])
        output: List[str] = []
        cursor = 0
        for start, end, canonical in replacements:
            if start < cursor:
                continue
            output.append(text[cursor:start])
            output.append(canonical)
            cursor = end
        output.append(text[cursor:])
        return "".join(output)

    @staticmethod
    def _is_sentence_suffix(text: str, matches: List[Match[str]], end: int) -> bool:
        if not matches:
            return False
        if end <= 0 or end > len(matches):
            return False

        span_end = matches[end - 1].end()
        tail = text[span_end:]

        index = 0
        tail_length = len(tail)
        while index < tail_length and tail[index].isspace():
            index += 1

        if index >= tail_length:
            return True

        char = tail[index]
        if char in SENTENCE_END_PUNCTUATION:
            index += 1
            while index < tail_length and tail[index] in SENTENCE_END_PUNCTUATION:
                index += 1
            while index < tail_length and tail[index] in SENTENCE_SUFFIX_TRAILERS:
                index += 1
            return True

        return False


__all__ = ["CanonicalPhrase", "PhraseCanonicalizer"]
