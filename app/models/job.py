from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from pathlib import Path


class JobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class CompressionJob:
    job_id: str
    status: JobStatus
    progress_percent: int
    original_filename: str
    input_path: Path
    output_path: Path
    original_size_bytes: int
    target_size_mb: float
    target_size_bytes: int
    output_size_bytes: int | None
    error_message: str | None
    created_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
