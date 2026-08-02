import asyncio
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import UploadFile

from app.config import (
    MAX_UPLOAD_SIZE_BYTES,
    OUTPUT_DIR,
    UPLOAD_CHUNK_SIZE_BYTES,
    UPLOAD_DIR,
)
from app.models.job import CompressionJob, JobStatus
from app.repositories.job_repository import job_repository
from app.services.compressor import (
    CompressionFailedError,
    CompressionTimeoutError,
    OutputValidationError,
    run_compression,
)

logger = logging.getLogger(__name__)


class UploadTooLargeError(Exception):
    pass


async def _save_upload(file: UploadFile, destination: Path) -> int:
    total_bytes = 0
    try:
        with destination.open("wb") as buffer:
            while chunk := await file.read(UPLOAD_CHUNK_SIZE_BYTES):
                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_SIZE_BYTES:
                    raise UploadTooLargeError("ファイルサイズが上限(500MB)を超えています")
                buffer.write(chunk)
    except UploadTooLargeError:
        destination.unlink(missing_ok=True)
        raise
    finally:
        await file.close()
    return total_bytes


async def create_job(file: UploadFile, target_size_mb: float) -> CompressionJob:
    extension = Path(file.filename or "").suffix.lower()
    job_id = uuid.uuid4().hex
    input_path = UPLOAD_DIR / f"{job_id}{extension}"
    output_path = OUTPUT_DIR / f"{job_id}.mp4"

    original_size_bytes = await _save_upload(file, input_path)

    job = CompressionJob(
        job_id=job_id,
        status=JobStatus.QUEUED,
        progress_percent=0,
        original_filename=file.filename or "",
        input_path=input_path,
        output_path=output_path,
        original_size_bytes=original_size_bytes,
        target_size_mb=target_size_mb,
        target_size_bytes=round(target_size_mb * 1_000_000),
        output_size_bytes=None,
        error_message=None,
        created_at=datetime.now(timezone.utc),
        started_at=None,
        completed_at=None,
    )
    job_repository.create(job)
    return job


async def process_job(job_id: str) -> None:
    job = job_repository.get(job_id)
    if job is None:
        return

    job_repository.mark_processing(job_id)

    try:
        output_size_bytes = await asyncio.to_thread(
            run_compression, job.input_path, job.output_path, job.target_size_mb
        )
        job_repository.mark_completed(job_id, output_size_bytes)
    except (CompressionTimeoutError, CompressionFailedError, OutputValidationError) as exc:
        logger.error("Job %s failed: %s", job_id, exc)
        job_repository.mark_failed(job_id, str(exc))
        job.output_path.unlink(missing_ok=True)
    except Exception:
        logger.exception("Job %s failed unexpectedly", job_id)
        job_repository.mark_failed(job_id, "予期しないエラーが発生しました")
        job.output_path.unlink(missing_ok=True)
    finally:
        job.input_path.unlink(missing_ok=True)
