from dotenv import load_dotenv
load_dotenv()
from pathlib import Path
import os
BASE_DIR = Path(__file__).resolve().parent.parent
APP_DIR = BASE_DIR / "app"
DATA_DIR = APP_DIR / "data"
MEDIA_DIR = BASE_DIR / "media" / "responses"
FRONTEND_DIR = BASE_DIR / "frontend"

QA_BANK_PATH = DATA_DIR / "qa_bank.json"

# "base" is too small for accurate Tamil (and accented English) recognition
# -- it's the main reason short/quiet clips get misheard or hallucinated.
# "small" is a solid accuracy/speed tradeoff on CPU; go to "medium" if your
# machine can spare the RAM/CPU time and you want noticeably better accuracy.
STT_MODEL_SIZE = "small"
STT_DEVICE = "cpu"
STT_COMPUTE_TYPE = "int8"

EMBEDDING_MODEL = "all-MiniLM-L6-v2"
EMBEDDING_DEVICE = "cpu"  # "cpu" or "cuda" for GPU acceleration
EMBEDDING_BATCH_SIZE = 32  # Batch size for encoding chunks
EMBEDDING_CACHE_QUERIES = True  # Cache query embeddings for faster repeated queries
MATCH_THRESHOLD = 0.55

# Tamil neural voice for edge-tts. Other good options:
#   "ta-IN-ValluvarNeural"  (India, male)
#   "ta-LK-SaranyaNeural"   (Sri Lanka, female)
#   "ta-LK-KumarNeural"     (Sri Lanka, male)
TTS_VOICE = "ta-IN-PallaviNeural"
FALLBACK_MESSAGE = "மன்னிக்கவும், இதற்கு எனக்கு பதில் இன்னும் தெரியவில்லை."

MAX_AUDIO_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
# Video ingestion (audio track -> STTService, sampled frames -> the same
# OCR+vision hybrid used for images). ffmpeg/ffprobe are external binaries,
# not Python packages -- same PATH gotcha as Tesseract, so allow pinning an
# explicit path via env var instead of relying on PATH.
FFMPEG_CMD = os.getenv("FFMPEG_CMD", "ffmpeg")
FFPROBE_CMD = os.getenv("FFPROBE_CMD", "ffprobe")
# A quick sanity cap on the raw upload before we even probe it (guards against
# someone uploading an absurd multi-GB file). The real cost driver for video
# is length, not bytes, so this is intentionally generous -- MAX_VIDEO_DURATION_SECONDS
# below is the cap that actually matters.
MAX_VIDEO_FILE_SIZE_BYTES = 500 * 1024 * 1024  # 500 MB
MAX_VIDEO_DURATION_SECONDS = 2 * 60 * 60  # 2 hours
# Chunking window for incremental indexing -- mirrors BATCH_PAGE_SIZE's role
# for PDFs, except the unit is seconds of video instead of pages.
VIDEO_CHUNK_WINDOW_SECONDS = 30
# Hard cap on vision-model calls per video, regardless of length -- a 10-minute
# video sampled every 5s would be 120 calls. Scene-change detection (preferred)
# or even spacing (fallback) both respect this cap.
MAX_VIDEO_FRAMES = 30
# Fallback fixed sampling interval, only used when PySceneDetect isn't
# installed or scene detection finds nothing usable.
VIDEO_FRAME_INTERVAL_SECONDS = 8

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GROQ_VISION_MODEL = "llama-3.2-11b-vision-preview"
# 220 was cutting off longer answers (e.g. step-by-step instructions) mid-sentence,
# which then played as truncated TTS audio. Raised so full answers fit; the model
# is separately instructed (see llm_service.py) to keep things concise for speech.
LLM_MAX_REPLY_TOKENS = 600

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/cubeai")