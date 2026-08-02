from datetime import datetime

from pydantic import BaseModel

from app.models.job import CompressionJob, JobStatus


class JobCreateResponse(BaseModel):
    job_id: str
    status: JobStatus
    status_url: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStatus
    progress_percent: int
    original_size_bytes: int
    target_size_bytes: int
    output_size_bytes: int | None
    download_url: str | None
    error_message: str | None
    created_at: datetime
    started_at: datetime | None
    completed_at: datetime | None


def job_to_status_response(job: CompressionJob) -> JobStatusResponse:
    download_url = (
        f"/jobs/{job.job_id}/download" if job.status == JobStatus.COMPLETED else None
    )
    return JobStatusResponse(
        job_id=job.job_id,
        status=job.status,
        progress_percent=job.progress_percent,
        original_size_bytes=job.original_size_bytes,
        target_size_bytes=job.target_size_bytes,
        output_size_bytes=job.output_size_bytes,
        download_url=download_url,
        error_message=job.error_message,
        created_at=job.created_at,
        started_at=job.started_at,
        completed_at=job.completed_at,
    )
