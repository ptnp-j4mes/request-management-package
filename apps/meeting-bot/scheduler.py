"""Main scheduler: polls DB for meetings to join/summarize and dispatches workers."""

import logging
import threading
import time
from datetime import datetime, timezone

import account_selector
import db
import gemini_summary
import meet_bot
from config import POLL_INTERVAL

logger = logging.getLogger(__name__)


def _summarize(conn, meeting_id: int, transcript: str) -> None:
    """Call Gemini, store summary markdown + extracted action items."""
    try:
        db.update_meeting(conn, meeting_id, summary_status="SUMMARIZING")
        summary_md = gemini_summary.summarize(transcript)
        items = gemini_summary.extract_action_items(summary_md)
        db.update_meeting(
            conn, meeting_id,
            summary_markdown=summary_md,
            summary_status="COMPLETED",
        )
        db.insert_action_items(conn, meeting_id, items)
        db.insert_bot_log(
            conn, meeting_id, "INFO",
            f"Gemini summary complete — {len(items)} action item(s) extracted",
        )
    except Exception as exc:
        logger.exception(f"[meeting {meeting_id}] Gemini summarization failed")
        db.update_meeting(conn, meeting_id, summary_status="FAILED")
        db.insert_bot_log(conn, meeting_id, "ERROR", f"Gemini summary failed: {exc}")


def process_meeting(conn_factory, meeting: dict) -> None:
    """Full lifecycle for one meeting: join → wait → leave → summarize."""
    meeting_id = meeting["id"]
    conn = conn_factory()

    try:
        db.insert_bot_log(conn, meeting_id, "INFO", "Meeting bot lifecycle started")

        # 1. Select bot account
        accounts = db.get_available_accounts(conn)
        acct = account_selector.select_account(meeting, accounts)
        if not acct:
            db.update_meeting(conn, meeting_id, bot_status="FAILED")
            db.insert_bot_log(conn, meeting_id, "ERROR", "No available Google bot account")
            return

        bot_email = acct["email"]
        db.update_meeting(
            conn, meeting_id,
            bot_status="WAITING_TO_JOIN",
            google_bot_account_id=acct["id"],
            selected_bot_email=bot_email,
            account_selection_reason=f"policy={meeting.get('account_selection_policy','LEAST_BUSY')}",
        )
        db.update_bot_account_status(conn, acct["id"], "IN_MEETING")

        playwright_ctx = None
        try:
            # 2. Join meeting
            db.update_meeting(conn, meeting_id, bot_status="JOINING")
            playwright, context, page = meet_bot.join_meeting(meeting["meeting_url"], bot_email)
            playwright_ctx = (playwright, context, page)

            db.update_meeting(
                conn, meeting_id,
                bot_status="IN_MEETING",
                joined_at=datetime.now(timezone.utc),
            )
            db.insert_bot_log(conn, meeting_id, "INFO", f"Joined Google Meet as {bot_email}")

            # 3. Wait until end_at + auto_leave_after_minutes (cap at 4h)
            end_at = meeting.get("end_at")
            if end_at and hasattr(end_at, "timestamp"):
                end_ts = end_at.timestamp()
            else:
                end_ts = datetime.now(timezone.utc).timestamp() + 3600

            auto_leave_secs = int(meeting.get("auto_leave_after_minutes", 10)) * 60
            wait_secs = max(0, end_ts - datetime.now(timezone.utc).timestamp()) + auto_leave_secs
            wait_secs = min(wait_secs, 4 * 3600)

            logger.info(f"[meeting {meeting_id}] Waiting {wait_secs:.0f}s before leaving")
            time.sleep(wait_secs)

            # 4. Leave
            meet_bot.leave_meeting(*playwright_ctx)
            playwright_ctx = None
            db.update_meeting(
                conn, meeting_id,
                bot_status="LEFT",
                left_at=datetime.now(timezone.utc),
            )
            db.insert_bot_log(conn, meeting_id, "INFO", "Left Google Meet")

        except Exception as exc:
            logger.exception(f"[meeting {meeting_id}] Error in meet_bot")
            if playwright_ctx:
                try:
                    meet_bot.leave_meeting(*playwright_ctx)
                except Exception:
                    pass
            db.update_meeting(conn, meeting_id, bot_status="FAILED")
            db.insert_bot_log(conn, meeting_id, "ERROR", f"meet_bot error: {exc}")

        finally:
            db.update_bot_account_status(conn, acct["id"], "AVAILABLE")

        # 5. Auto-summarize if transcript already set (via API stub or recorder)
        transcript = meeting.get("transcript_text")
        if meeting.get("auto_summarize") and transcript:
            _summarize(conn, meeting_id, transcript)

    except Exception as exc:
        logger.exception(f"[meeting {meeting_id}] Unhandled error in process_meeting")
    finally:
        try:
            conn.close()
        except Exception:
            pass


def run_scheduler(conn_factory) -> None:
    """Main poll loop. Runs forever until the process is killed."""
    logger.info(f"Scheduler started — polling every {POLL_INTERVAL}s")

    while True:
        try:
            with conn_factory() as conn:
                # a) Dispatch meetings due to join
                meetings_to_join = db.find_meetings_to_join(conn)
                if meetings_to_join:
                    logger.info(f"Found {len(meetings_to_join)} meeting(s) to join")
                for meeting in meetings_to_join:
                    # Mark immediately so next poll doesn't re-pick the same meeting
                    db.update_meeting(conn, meeting["id"], bot_status="WAITING_TO_JOIN")
                    t = threading.Thread(
                        target=process_meeting,
                        args=(conn_factory, dict(meeting)),
                        daemon=True,
                        name=f"meeting-{meeting['id']}",
                    )
                    t.start()

                # b) Run Gemini summarization for meetings awaiting it
                to_summarize = db.find_meetings_to_summarize(conn)
                if to_summarize:
                    logger.info(f"Found {len(to_summarize)} meeting(s) to summarize")
                for meeting in to_summarize:
                    _summarize(conn, meeting["id"], meeting["transcript_text"])

        except Exception as exc:
            logger.exception(f"Scheduler poll error: {exc}")

        time.sleep(POLL_INTERVAL)
