"""Meeting Bot Worker — entrypoint."""

import logging
import sys
import time

import psycopg2
from psycopg2.extras import RealDictCursor

from config import DATABASE_URL, POLL_INTERVAL
from scheduler import run_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger(__name__)


def make_conn():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def wait_for_db(retries: int = 10, delay: int = 5) -> None:
    """Retry DB connection on startup (DB might still be initializing)."""
    for attempt in range(1, retries + 1):
        try:
            conn = make_conn()
            conn.close()
            logger.info("Database connection established")
            return
        except Exception as exc:
            logger.warning(f"DB not ready (attempt {attempt}/{retries}): {exc}")
            if attempt < retries:
                time.sleep(delay)
    logger.error("Could not connect to database after retries — exiting")
    sys.exit(1)


if __name__ == "__main__":
    logger.info("=== Meeting Bot Worker starting ===")
    wait_for_db()
    run_scheduler(make_conn)
