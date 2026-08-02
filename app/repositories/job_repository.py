import threading
from datetime import datetime, timezone

from app.models.job import CompressionJob, JobStatus


class JobRepository:
    def __init__(self) -> None:
        self._jobs: dict[str, CompressionJob] = {}
        self._lock = threading.Lock()

    def create(self, job: CompressionJob) -> None:
        with self._lock:
            self._jobs[job.job_id] = job

    def get(self, job_id: str) -> CompressionJob | None:
        with self._lock:
            return self._jobs.get(job_id)

    def mark_processing(self, job_id: str) -> None:
        with self._lock:
            job = self._jobs[job_id]
            job.status = JobStatus.PROCESSING
            job.progress_percent = 10
            job.started_at = datetime.now(timezone.utc)

    def mark_completed(self, job_id: str, output_size_bytes: int) -> None:
        with self._lock:
            job = self._jobs[job_id]
            job.status = JobStatus.COMPLETED
            job.progress_percent = 100
            job.output_size_bytes = output_size_bytes
            job.completed_at = datetime.now(timezone.utc)

    def mark_failed(self, job_id: str, error_message: str) -> None:
        with self._lock:
            job = self._jobs[job_id]
            job.status = JobStatus.FAILED
            job.error_message = error_message
            job.completed_at = datetime.now(timezone.utc)


job_repository = JobRepository()
