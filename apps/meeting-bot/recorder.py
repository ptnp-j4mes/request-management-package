"""Audio recording and transcription utilities."""

import logging
import subprocess
import tempfile
from pathlib import Path

logger = logging.getLogger(__name__)


def record_audio_ffmpeg(duration_seconds: int, output_path: str) -> bool:
    """
    Capture system audio via PulseAudio default sink monitor.
    Requires: ffmpeg + PulseAudio (both available in the Playwright Docker image).

    The Playwright Docker image uses a virtual PulseAudio sink so browser audio
    routes through it and can be captured by ffmpeg.
    """
    try:
        logger.info(f"Recording {duration_seconds}s of audio to {output_path}")
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-f", "pulse",
                "-i", "default",
                "-t", str(duration_seconds),
                "-acodec", "libmp3lame",
                "-q:a", "4",
                output_path,
            ],
            check=True,
            timeout=duration_seconds + 30,
            capture_output=True,
        )
        logger.info(f"Audio recording saved: {output_path}")
        return True
    except subprocess.CalledProcessError as e:
        logger.error(f"ffmpeg error: {e.stderr.decode()}")
        return False
    except Exception as e:
        logger.error(f"Recording failed: {e}")
        return False


def audio_to_transcript(audio_path: str) -> str | None:
    """
    Upload audio to Gemini and get a transcript.
    Gemini 1.5 Pro supports direct audio file input.
    """
    try:
        import google.generativeai as genai
        from config import GEMINI_API_KEY

        if not GEMINI_API_KEY:
            logger.error("GEMINI_API_KEY not set — cannot transcribe")
            return None

        genai.configure(api_key=GEMINI_API_KEY)
        logger.info(f"Uploading audio for transcription: {audio_path}")
        audio_file = genai.upload_file(audio_path)
        model = genai.GenerativeModel("gemini-1.5-pro")
        response = model.generate_content([
            "Please transcribe this meeting audio accurately. Include speaker labels if distinguishable.",
            audio_file,
        ])
        logger.info("Transcription complete")
        return response.text
    except Exception as e:
        logger.error(f"Transcription failed: {e}")
        return None
