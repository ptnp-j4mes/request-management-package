"""Playwright automation for joining and leaving Google Meet."""

import logging
from pathlib import Path

from playwright.sync_api import sync_playwright, BrowserContext, Page

from config import PROFILES_DIR, HEADLESS

logger = logging.getLogger(__name__)

JOIN_SELECTORS = [
    "button:has-text('Join now')",
    "button:has-text('Ask to join')",
    "button:has-text('เข้าร่วมเลย')",
    "button:has-text('ขอเข้าร่วม')",
]

LEAVE_SELECTORS = [
    "button[aria-label='Leave call']",
    "button[aria-label='ออกจากการโทร']",
    "button:has-text('Leave')",
    "button:has-text('ออก')",
]


def get_profile_dir(email: str) -> str:
    safe = email.replace("@", "_at_").replace(".", "_")
    profile_dir = Path(PROFILES_DIR) / safe
    profile_dir.mkdir(parents=True, exist_ok=True)
    return str(profile_dir)


def join_meeting(meeting_url: str, bot_email: str):
    """
    Launch Playwright with a persistent browser profile and join the Google Meet.
    Returns (playwright, context, page) — caller must call leave_meeting() afterwards.

    Note: Google Meet requires a non-headless browser or a virtual display (Xvfb).
    The official Playwright Docker image includes Xvfb and sets DISPLAY automatically.
    Set MEETING_BOT_HEADLESS=false (default) for best compatibility.
    """
    profile_dir = get_profile_dir(bot_email)
    logger.info(f"Opening browser profile: {profile_dir}")

    playwright = sync_playwright().start()
    context: BrowserContext = playwright.chromium.launch_persistent_context(
        profile_dir,
        headless=HEADLESS,
        args=[
            "--use-fake-ui-for-media-stream",    # auto-grant mic/camera to avoid popups
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
        ],
    )

    page: Page = context.new_page()
    logger.info(f"Navigating to {meeting_url}")
    page.goto(meeting_url, wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(3000)

    # Mute mic and camera before joining
    try:
        page.keyboard.press("Control+D")
        page.keyboard.press("Control+E")
        logger.info("Muted mic and camera")
    except Exception:
        pass

    # Click the join button
    joined = False
    for selector in JOIN_SELECTORS:
        try:
            locator = page.locator(selector)
            if locator.count() > 0:
                locator.first.click()
                page.wait_for_timeout(2000)
                joined = True
                logger.info(f"Clicked join button: {selector}")
                break
        except Exception as e:
            logger.debug(f"Join selector '{selector}' failed: {e}")

    if not joined:
        logger.warning("Could not find join button — may be in lobby or already joined")

    return playwright, context, page


def leave_meeting(playwright, context: BrowserContext, page: Page) -> None:
    """Click the leave button and close the browser."""
    try:
        for selector in LEAVE_SELECTORS:
            try:
                locator = page.locator(selector)
                if locator.count() > 0:
                    locator.first.click()
                    page.wait_for_timeout(1000)
                    logger.info(f"Clicked leave button: {selector}")
                    break
            except Exception:
                continue
    except Exception as e:
        logger.warning(f"Error clicking leave button: {e}")
    finally:
        try:
            context.close()
        except Exception:
            pass
        try:
            playwright.stop()
        except Exception:
            pass
        logger.info("Browser closed")
