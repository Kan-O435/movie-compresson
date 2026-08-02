from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.config import ALLOWED_EXTENSIONS, DEFAULT_TARGET_SIZE_MB
from app.models.job import JobStatus
from app.repositories.job_repository import job_repository
from app.schemas.job import JobCreateResponse, JobStatusResponse, job_to_status_response
from app.services import job_service

router = APIRouter()


@router.post("/jobs", status_code=202, response_model=JobCreateResponse)
async def create_job_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    target_size_mb: float = Form(DEFAULT_TARGET_SIZE_MB),
) -> JobCreateResponse:
    if target_size_mb <= 0:
        raise HTTPException(status_code=400, detail="target_size_mbは0より大きい値を指定してください")

    extension = Path(file.filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"対応していないファイル形式です: {extension or '(不明)'}")

    try:
        job = await job_service.create_job(file, target_size_mb)
    except job_service.UploadTooLargeError as exc:
        raise HTTPException(status_code=413, detail=str(exc)) from exc

    background_tasks.add_task(job_service.process_job, job.job_id)

    return JobCreateResponse(
        job_id=job.job_id,
        status=job.status,
        status_url=f"/jobs/{job.job_id}",
    )


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_endpoint(job_id: str) -> JobStatusResponse:
    job = job_repository.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="ジョブが見つかりません")
    return job_to_status_response(job)


@router.get("/jobs/{job_id}/download")
async def download_job_endpoint(job_id: str) -> FileResponse:
    job = job_repository.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="ジョブが見つかりません")

    if job.status in (JobStatus.QUEUED, JobStatus.PROCESSING):
        raise HTTPException(status_code=409, detail="ジョブがまだ完了していません")
    if job.status == JobStatus.FAILED:
        raise HTTPException(status_code=409, detail="ジョブは失敗しました")

    if not job.output_path.is_file():
        raise HTTPException(status_code=404, detail="出力ファイルが見つかりません")

    return FileResponse(
        path=job.output_path,
        media_type="video/mp4",
        filename=f"{job.job_id}.mp4",
    )
