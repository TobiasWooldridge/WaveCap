"""Keyword alert evaluation."""

from __future__ import annotations

import re
from typing import Iterable, List

from .models import AlertRule, AlertsConfig, TranscriptionAlertTrigger


class TranscriptionAlertEvaluator:
    """Checks transcripts for keyword hits."""

    def __init__(self, config: AlertsConfig):
        self.update_config(config)

    def update_config(self, config: AlertsConfig) -> None:
        self.config = config
        self._compiled_rules: List[tuple[AlertRule, re.Pattern[str]]] = []
        if not self.config.enabled:
            return
        for rule in self.config.rules:
            if not rule.enabled:
                continue
            flags = 0 if rule.caseSensitive else re.IGNORECASE
            pattern = re.compile(
                "|".join(re.escape(phrase) for phrase in rule.phrases), flags
            )
            self._compiled_rules.append((rule, pattern))

    def evaluate(self, text: str) -> List[TranscriptionAlertTrigger]:
        if not self.config.enabled:
            return []
        triggers: List[TranscriptionAlertTrigger] = []
        for rule, pattern in self._compiled_rules:
            matches = pattern.findall(text)
            if matches:
                triggers.append(
                    TranscriptionAlertTrigger(
                        ruleId=rule.id,
                        label=rule.label,
                        matchedPhrases=list(
                            {
                                match.lower() if not rule.caseSensitive else match
                                for match in matches
                            }
                        ),
                        playSound=rule.playSound,
                        notify=rule.notify,
                    )
                )
        return triggers


__all__ = ["TranscriptionAlertEvaluator"]
