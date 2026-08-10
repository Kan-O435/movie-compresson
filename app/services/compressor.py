import logging
import subprocess
from pathlib import Path

from app.config import COMPRESS_SCRIPT_PATH, COMPRESSION_TIMEOUT_SECONDS

logger = logging.getLogger(__name__)


class CompressionTimeoutError(Exception):
    pass


class CompressionFailedError(Exception):
    pass


class OutputValidationError(Exception):
    pass


def compress_video(input_path: Path, output_path: Path, target_size_mb: float) -> None:
    try:
        result = subprocess.run(
            [
                str(COMPRESS_SCRIPT_PATH),
                str(input_path),
                str(output_path),
                str(target_size_mb),
            ],
            shell=False,
            capture_output=True,
            text=True,
            timeout=COMPRESSION_TIMEOUT_SECONDS,
        )
    except subprocess.TimeoutExpired as exc:
        logger.error("compress.sh timed out for %s: %s", input_path, exc)
        raise CompressionTimeoutError(f"圧縮処理が{COMPRESSION_TIMEOUT_SECONDS}秒以内に終了しませんでした") from exc

    if result.returncode != 0:
        logger.error(
            "compress.sh failed (returncode=%s) for %s\nstdout:\n%s\nstderr:\n%s",
            result.returncode,
            input_path,
            result.stdout,
            result.stderr,
        )
        raise CompressionFailedError("動画の圧縮に失敗しました")


def run_compression(input_path: Path, output_path: Path, target_size_mb: float) -> int:
    compress_video(input_path, output_path, target_size_mb)

    if not output_path.is_file():
        raise OutputValidationError("出力ファイルが生成されませんでした")

    output_size_bytes = output_path.stat().st_size
    if output_size_bytes <= 0:
        raise OutputValidationError("出力ファイルが空です")

    target_size_bytes = round(target_size_mb * 1_000_000)
    if output_size_bytes > target_size_bytes:
        raise OutputValidationError("圧縮後のファイルサイズが目標サイズを超過しました")

    return output_size_bytes
