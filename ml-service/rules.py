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
    # Physical violence and bullying. "attack" also catches "heart attack", which is an
    # emergency too. "injur" catches "injured", "injury".
    "bully", "bullie", "attack", "injur", "weapon", "knife", "knives",
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
    r"|\bacid\s+attack\w*"
    # Assault in everyday words. "beat" counts only as "beat ... up" or "beaten", so "beat the
    # deadline" does not match. "hit" and the like need a person after them ("hit me").
    r"|\bbeat(?:s|en|ing)?\s+(?:\w+\s+){0,2}up\b"
    r"|\bbeaten\b"
    r"|\b(?:hit|hits|hitting|slapp?ed|slapping|punch(?:ed|es|ing)|kick(?:ed|ing))\s+(?:me|him|her|them|us|my)\b"
    r"|\bfight(?:s|ing)?\b|\bfought\b",
    re.IGNORECASE,
)


# A basic service (water, power) gone for days is HIGH even without a critical word: the model
# reads "no water in hostel for 3 days" as an ordinary MEDIUM complaint.
_SERVICE = r"(?:water|electricity|power|current|light|lights)"
_OUTAGE_PATTERN = re.compile(
    r"\b(?:no|without|not\s+getting|no\s+supply\s+of)\s+(?:\w+\s+){0,2}" + _SERVICE + r"\b"
    r"|\b" + _SERVICE + r"\s+(?:\w+\s+){0,3}(?:not\s+(?:working|available|coming)|cut|outage|shortage|gone)\b",
    re.IGNORECASE,
)
_DAYS_PATTERN = re.compile(
    r"\b(?:\d+|two|three|four|five|six|seven|several|many|few)\s+(?:days|weeks)\b|\b(?:a|one)\s+week\b",
    re.IGNORECASE,
)


def is_prolonged_outage(text: str) -> bool:
    """True when the text names a missing basic service and a duration of days or weeks."""
    return bool(_OUTAGE_PATTERN.search(text) and _DAYS_PATTERN.search(text))


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
    if is_prolonged_outage(text):
        return "HIGH", False, None
    if category == "HARASSMENT" and priority == "LOW":
        return "MEDIUM", False, None
    return priority, False, None
