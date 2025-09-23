from wavecap_backend.alerts import TranscriptionAlertEvaluator
from wavecap_backend.models import AlertRule, AlertsConfig


def test_evaluator_matches_phrases_case_insensitive():
    config = AlertsConfig(
        enabled=True,
        rules=[AlertRule(id="sos", phrases=["Help", "Fire"], label="Emergency")],
    )
    evaluator = TranscriptionAlertEvaluator(config)

    triggers = evaluator.evaluate("There's a fire! Please HELP us now.")

    assert len(triggers) == 1
    trigger = triggers[0]
    assert trigger.ruleId == "sos"
    assert set(trigger.matchedPhrases) == {"fire", "help"}
    assert trigger.playSound is True
    assert trigger.notify is True


def test_evaluator_respects_case_sensitive_rules():
    config = AlertsConfig(
        enabled=True,
        rules=[
            AlertRule(
                id="alert",
                phrases=["ALERT"],
                caseSensitive=True,
                playSound=False,
                notify=False,
            ),
        ],
    )
    evaluator = TranscriptionAlertEvaluator(config)

    triggers = evaluator.evaluate("alert ALERT")

    assert len(triggers) == 1
    trigger = triggers[0]
    assert trigger.matchedPhrases == ["ALERT"]
    assert trigger.playSound is False
    assert trigger.notify is False


def test_evaluator_disabled_returns_empty():
    config = AlertsConfig(
        enabled=False,
        rules=[AlertRule(id="ignored", phrases=["anything"])],
    )
    evaluator = TranscriptionAlertEvaluator(config)

    assert evaluator.evaluate("anything at all") == []
