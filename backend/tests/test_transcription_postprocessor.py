from wavecap_backend.transcription_postprocessor import (
    PhraseCanonicalizer,
)


def test_phrase_canonicalizer_handles_variants() -> None:
    canonicalizer = PhraseCanonicalizer.with_default_phrases()
    text = "adel aide fire out reported near norlunga station request sit rep update"
    result = canonicalizer.canonicalize(text)
    assert "Adelaide fire out" in result
    assert "Noarlunga" in result
    assert "SITREP" in result


def test_phrase_canonicalizer_leaves_unmatched_text() -> None:
    canonicalizer = PhraseCanonicalizer.with_default_phrases()
    text = "Routine radio check in progress"
    assert canonicalizer.canonicalize(text) == text


def test_phrase_canonicalizer_handles_radio_prowords() -> None:
    canonicalizer = PhraseCanonicalizer.with_default_phrases()
    text = (
        "Command this is Rescue one, message received over. "
        "Will advise when clear, over and out."
    )
    result = canonicalizer.canonicalize(text)
    assert "Over." in result
    assert "Over and out." in result


def test_phrase_canonicalizer_skips_mid_sentence_prowords() -> None:
    canonicalizer = PhraseCanonicalizer.with_default_phrases()
    text = "The aircraft flew over the ridge before lights out across the valley"
    result = canonicalizer.canonicalize(text)
    assert "flew over the" in result
    assert "lights out across" in result
