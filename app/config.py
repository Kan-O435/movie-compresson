from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"
COMPRESS_SCRIPT_PATH = BASE_DIR / "scripts" / "compress.sh"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv"}

MAX_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024
UPLOAD_CHUNK_SIZE_BYTES = 1 * 1024 * 1024

DEFAULT_TARGET_SIZE_MB = 9.5
COMPRESSION_TIMEOUT_SECONDS = 600
