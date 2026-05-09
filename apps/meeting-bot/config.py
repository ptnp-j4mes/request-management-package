import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
POLL_INTERVAL = int(os.getenv("MEETING_BOT_POLL_INTERVAL", "60"))
HEADLESS = os.getenv("MEETING_BOT_HEADLESS", "false").lower() == "true"
PROFILES_DIR = os.getenv("MEETING_BOT_PROFILES_DIR", "./bot_profiles")
