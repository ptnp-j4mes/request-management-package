"""Gemini API integration for meeting summarization and action item extraction."""

import logging

logger = logging.getLogger(__name__)

# BA Requirement summary pattern (from design doc section 24–25)
SUMMARY_PROMPT = """\
คุณคือ BA ที่ช่วยสรุปประชุมสำหรับระบบ Request Management

โปรดสรุป transcript ต่อไปนี้ให้อยู่ในรูปแบบ Markdown ตามโครงสร้างนี้:

# Meeting Summary

## 1. ภาพรวม
สรุปภาพรวมของการประชุมแบบเข้าใจง่าย

## 2. จุดประสงค์ของการประชุม
สรุปเป็น bullet

## 3. เป้าหมายของโปรเจกต์
สรุปเป้าหมาย business และ technical

## 4. สิ่งที่ผู้ใช้อยากได้
แยกเป็นรายการ requirement ที่ชัดเจน

## 5. Scope งาน
### In Scope
### Out of Scope

## 6. ผู้เกี่ยวข้อง
ระบุชื่อหรือ role ที่พูดถึง

## 7. Action Items
ทำเป็นตาราง: งาน | ผู้รับผิดชอบ | วันครบกำหนด | สถานะ

## 8. คำถามที่ยังต้องเคลียร์
รายการคำถาม

## 9. ความเสี่ยง / ข้อควรระวัง
รายการความเสี่ยง

## 10. สรุปสำหรับ BA
เขียน requirement เบื้องต้นที่ BA เอาไปทำต่อได้

Transcript:
{transcript}
"""


def summarize(transcript: str) -> str:
    """Send transcript to Gemini and return the markdown summary."""
    import google.generativeai as genai
    from config import GEMINI_API_KEY

    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not set")

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-pro")

    logger.info("Sending transcript to Gemini for summarization")
    response = model.generate_content(SUMMARY_PROMPT.format(transcript=transcript))
    logger.info("Gemini response received")
    return response.text


def extract_action_items(summary_markdown: str) -> list[dict]:
    """
    Parse the Action Items markdown table from the Gemini summary output.

    Expected table format:
    | งาน | ผู้รับผิดชอบ | วันครบกำหนด | สถานะ |
    |---|---|---|---|
    | Draft BA doc | Alice | 2026-05-20 | OPEN |
    """
    items = []
    in_action_table = False

    for line in summary_markdown.splitlines():
        line = line.strip()

        # Detect start of Action Items section
        if "Action Items" in line and line.startswith("#"):
            in_action_table = True
            continue

        # Exit when next section starts
        if in_action_table and line.startswith("##"):
            break

        if not in_action_table:
            continue

        # Skip header and separator rows
        if not line.startswith("|"):
            continue
        if "---" in line:
            continue
        if "งาน" in line or "Task" in line:
            continue

        cols = [c.strip() for c in line.strip("|").split("|")]
        if not cols or not cols[0]:
            continue

        items.append({
            "title": cols[0],
            "owner_name": cols[1] if len(cols) > 1 and cols[1] else None,
            "due_date": _parse_date(cols[2]) if len(cols) > 2 and cols[2] else None,
            "status": "OPEN",
        })

    logger.info(f"Extracted {len(items)} action items from summary")
    return items


def _parse_date(value: str) -> str | None:
    """Return ISO date string or None if unparseable."""
    if not value or value in ("-", "TBD", "N/A", "ยังไม่กำหนด"):
        return None
    # Accept YYYY-MM-DD directly
    import re
    if re.match(r"\d{4}-\d{2}-\d{2}", value):
        return value[:10]
    return None
