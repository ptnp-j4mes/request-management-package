"""Select the best available Google bot account for a meeting."""

import logging

logger = logging.getLogger(__name__)


def _find_by_id(accounts: list[dict], account_id: int) -> dict | None:
    for a in accounts:
        if a["id"] == account_id:
            return a
    return None


def select_account(meeting: dict, accounts: list[dict]) -> dict | None:
    """
    Priority order (from design doc section 7):
    1. Meeting-level override (google_bot_account_id set on the meeting)
    2. Program default (default_google_bot_account_id) when policy=DEFAULT_ACCOUNT
    3. Policy-based selection (LEAST_BUSY, ROUND_ROBIN)
    4. Any available account as fallback
    """
    active = [
        a for a in accounts
        if a["is_active"] and a["current_status"] == "AVAILABLE"
    ]

    # 1. Meeting-level override
    if meeting.get("google_bot_account_id"):
        acct = _find_by_id(accounts, meeting["google_bot_account_id"])
        if acct and acct["current_status"] == "AVAILABLE":
            logger.info(f"Using meeting-level bot account: {acct['email']}")
            return acct
        logger.warning("Meeting-level bot account not available, falling back")

    policy = meeting.get("account_selection_policy", "LEAST_BUSY")

    # 2. Default account
    if policy == "DEFAULT_ACCOUNT" and meeting.get("default_google_bot_account_id"):
        acct = _find_by_id(active, meeting["default_google_bot_account_id"])
        if acct:
            logger.info(f"Using default bot account: {acct['email']}")
            return acct
        logger.warning("Default bot account not available, falling back")

    if not active:
        logger.warning("No available bot accounts")
        return None

    # 3. Policy selection
    if policy == "LEAST_BUSY":
        selected = min(active, key=lambda a: a.get("active_meeting_count", 0))
        logger.info(f"LEAST_BUSY selected: {selected['email']} (active={selected.get('active_meeting_count', 0)})")
        return selected

    if policy == "ROUND_ROBIN":
        # Simplified: rotate by active_meeting_count as tiebreaker
        selected = sorted(active, key=lambda a: a.get("active_meeting_count", 0))[0]
        logger.info(f"ROUND_ROBIN selected: {selected['email']}")
        return selected

    # 4. Fallback: first available
    logger.info(f"Fallback to first available: {active[0]['email']}")
    return active[0]
