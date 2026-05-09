"""Database access layer — all SQL queries for the meeting bot worker."""

import json
import logging
from datetime import datetime, timezone
from typing import Any

import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)


def _cursor(conn):
    return conn.cursor()


# ── read queries ──────────────────────────────────────────────────────────────

def find_meetings_to_join(conn) -> list[dict]:
    """Meetings with bot_status='SCHEDULED' whose start_at is within auto_join_before_minutes."""
    with _cursor(conn) as cur:
        cur.execute("""
            SELECT
                pm.*,
                pms.auto_join_before_minutes,
                pms.auto_leave_after_minutes,
                pms.auto_transcribe,
                pms.auto_summarize,
                pms.account_selection_policy,
                pms.default_google_bot_account_id
            FROM project_meetings pm
            JOIN project_meeting_settings pms ON pms.project_id = pm.project_id
            WHERE pm.bot_status = 'SCHEDULED'
              AND pms.meeting_bot_enabled = true
              AND pm.start_at <= NOW() + (pms.auto_join_before_minutes || ' minutes')::interval
              AND pm.meeting_url IS NOT NULL
        """)
        return [dict(row) for row in cur.fetchall()]


def find_meetings_to_summarize(conn) -> list[dict]:
    """Meetings with summary_status='SUMMARIZING' and transcript available."""
    with _cursor(conn) as cur:
        cur.execute("""
            SELECT * FROM project_meetings
            WHERE summary_status = 'SUMMARIZING'
              AND transcript_text IS NOT NULL
              AND transcript_text != ''
        """)
        return [dict(row) for row in cur.fetchall()]


def get_available_accounts(conn) -> list[dict]:
    """All active Google bot accounts (any status — account_selector filters further)."""
    with _cursor(conn) as cur:
        cur.execute("""
            SELECT
                gba.*,
                (
                    SELECT COUNT(*)
                    FROM project_meetings pm
                    WHERE pm.google_bot_account_id = gba.id
                      AND pm.bot_status IN ('WAITING_TO_JOIN', 'JOINING', 'IN_MEETING')
                ) AS active_meeting_count
            FROM google_bot_accounts gba
            WHERE gba.is_active = true
        """)
        return [dict(row) for row in cur.fetchall()]


# ── write queries ─────────────────────────────────────────────────────────────

def update_meeting(conn, meeting_id: int, **fields) -> None:
    if not fields:
        return
    set_clauses = []
    values = []
    for col, val in fields.items():
        # Convert camelCase field names to snake_case column names
        snake = _to_snake(col)
        set_clauses.append(f"{snake} = %s")
        values.append(val)
    values.append(meeting_id)
    sql = f"UPDATE project_meetings SET {', '.join(set_clauses)}, updated_at = NOW() WHERE id = %s"
    with _cursor(conn) as cur:
        cur.execute(sql, values)
    conn.commit()


def update_bot_account_status(conn, account_id: int, status: str) -> None:
    with _cursor(conn) as cur:
        cur.execute(
            "UPDATE google_bot_accounts SET current_status = %s, updated_at = NOW() WHERE id = %s",
            (status, account_id),
        )
    conn.commit()


def insert_action_items(conn, meeting_id: int, items: list[dict]) -> None:
    if not items:
        return
    with _cursor(conn) as cur:
        for item in items:
            cur.execute(
                """
                INSERT INTO meeting_action_items (meeting_id, title, owner_name, due_date, status)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    meeting_id,
                    item.get("title", ""),
                    item.get("owner_name"),
                    item.get("due_date") or None,
                    item.get("status", "OPEN"),
                ),
            )
    conn.commit()


def insert_bot_log(
    conn, meeting_id: int, level: str, message: str, metadata: Any = None
) -> None:
    meta_json = json.dumps(metadata) if metadata is not None else None
    with _cursor(conn) as cur:
        cur.execute(
            """
            INSERT INTO meeting_bot_logs (meeting_id, level, message, metadata)
            VALUES (%s, %s, %s, %s)
            """,
            (meeting_id, level, message, meta_json),
        )
    conn.commit()
    logger.info(f"[meeting {meeting_id}] [{level}] {message}")


# ── helpers ───────────────────────────────────────────────────────────────────

def _to_snake(name: str) -> str:
    """Convert camelCase/PascalCase to snake_case for column mapping."""
    import re
    s1 = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", name)
    return re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s1).lower()
