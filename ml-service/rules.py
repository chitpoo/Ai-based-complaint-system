"""Keyword rules applied after the models (plan.md §4).

Kept apart from app.py so the rules can be read and tested without loading the models.
"""
import re

# Stems are anchored at the start of a word and may be followed by any ending, so "threat"
# also catches "threatens" and "threatened", and "urgen" catches "urgent", "urgently", "urgency".
# Whole-word matching missed those forms, and the models cannot make up for it because the
# inflected words are mostly absent from the training vocabulary.
_STEMS = (
    "ragging", "ragged", "harass", "unsafe", "threat", "assault", "abus", "suicid",
    "emergenc", "urgen", "discriminat", "brib", "stalk", "molest",
)

_CRITICAL_PATTERN = re.compile(
    r"\b(?:" + "|".join(_STEMS) + r")\w*"
    # "corrupt" stays closed: a "corrupted file" is not a corruption complaint.
    r"|\bcorrupt(?:ion)?\b"
    r"|\bself[-\s]?harm\w*"
    # Unmistakable phrases outside the plan's list. "kill" takes verb endings only, so
    # "skill" and "mosquito killer" do not match.
    r"|\bkill(?:s|ed|ing)?\b"
    r"|\brap(?:e|es|ed|ing|ist|ists)\b"
    r"|\bend(?:ing)?\s+(?:my|his|her|their)\s+life\b"
    r"|\bacid\s+attack\w*",
    re.IGNORECASE,
)


def find_critical_keyword(text: str) -> str | None:
    """Return the first critical word or phrase in the text, lower-cased, or None."""
    match = _CRITICAL_PATTERN.search(text)
    return match.group(0).lower() if match else None


def apply_rules(text: str, category: str, priority: str) -> tuple[str, bool, str | None]:
    """Return (final priority, keyword_override, matched keyword).

    A keyword hit always wins, even inside a negation ("this is not a threat"): a wrongly
    raised priority costs an officer a minute, a missed one can cost much more.
    """
    keyword = find_critical_keyword(text)
    if keyword is not None:
        return "HIGH", True, keyword
    if category == "HARASSMENT" and priority == "LOW":
        return "MEDIUM", False, None
    return priority, False, None
