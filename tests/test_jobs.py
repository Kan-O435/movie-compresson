import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.job import CompressionJob, JobStatus
from app.repositories.job_repository import job_repository
from app.services import job_service
from app.services.compressor import CompressionFailedError


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(autouse=True)
def isolate_dirs(tmp_path, monkeypatch):
    upload_dir = tmp_path / "uploads"
    output_dir = tmp_path / "outputs"
    upload_dir.mkdir()
    output_dir.mkdir()
    monkeypatch.setattr(job_service, "UPLOAD_DIR", upload_dir)
    monkeypatch.setattr(job_service, "OUTPUT_DIR", output_dir)
    return upload_dir, output_dir


def _dummy_video_file(name: str = "sample.mp4"):
    return {"file": (name, b"dummy video bytes", "video/mp4")}


def _make_job(status: JobStatus, output_path=None) -> CompressionJob:
    job_id = uuid.uuid4().hex
    now = datetime.now(timezone.utc)
    job = CompressionJob(
        job_id=job_id,
        status=status,
        progress_percent=0,
        original_filename="sample.mp4",
        input_path=output_path.parent / f"{job_id}.mp4",
        output_path=output_path,
        original_size_bytes=1000,
        target_size_mb=9.5,
        target_size_bytes=9_500_000,
        output_size_bytes=None,
        error_message=None,
        created_at=now,
        started_at=None,
        completed_at=None,
    )
    job_repository.create(job)
    return job


def test_create_job_returns_202_with_job_id_and_status_url(client, monkeypatch):
    monkeypatch.setattr(job_service, "run_compression", lambda *a, **k: 123)

    response = client.post(
        "/jobs", files=_dummy_video_file(), data={"target_size_mb": "9.5"}
    )

    assert response.status_code == 202
    body = response.json()
    assert "job_id" in body
    assert body["status_url"] == f"/jobs/{body['job_id']}"


def test_create_job_invalid_extension_returns_400(client):
    response = client.post(
        "/jobs", files=_dummy_video_file(name="sample.txt"), data={"target_size_mb": "9.5"}
    )
    assert response.status_code == 400


def test_create_job_invalid_target_size_returns_400(client):
    response = client.post(
        "/jobs", files=_dummy_video_file(), data={"target_size_mb": "0"}
    )
    assert response.status_code == 400


def test_get_job_not_found_returns_404(client):
    response = client.get("/jobs/does-not-exist")
    assert response.status_code == 404


def test_download_not_found_returns_404(client):
    response = client.get("/jobs/does-not-exist/download")
    assert response.status_code == 404


def test_download_queued_job_returns_409(client, tmp_path):
    job = _make_job(JobStatus.QUEUED, output_path=tmp_path / "out.mp4")
    response = client.get(f"/jobs/{job.job_id}/download")
    assert response.status_code == 409


def test_download_processing_job_returns_409(client, tmp_path):
    job = _make_job(JobStatus.PROCESSING, output_path=tmp_path / "out.mp4")
    response = client.get(f"/jobs/{job.job_id}/download")
    assert response.status_code == 409


def test_download_failed_job_returns_409(client, tmp_path):
    job = _make_job(JobStatus.FAILED, output_path=tmp_path / "out.mp4")
    response = client.get(f"/jobs/{job.job_id}/download")
    assert response.status_code == 409


def test_job_completes_successfully_and_sets_download_url(client, monkeypatch, isolate_dirs):
    _, output_dir = isolate_dirs

    def fake_run_compression(input_path, output_path, target_size_mb):
        output_path.write_bytes(b"compressed")
        return output_path.stat().st_size

    monkeypatch.setattr(job_service, "run_compression", fake_run_compression)

    response = client.post(
        "/jobs", files=_dummy_video_file(), data={"target_size_mb": "9.5"}
    )
    job_id = response.json()["job_id"]

    status_response = client.get(f"/jobs/{job_id}")
    body = status_response.json()
    assert body["status"] == JobStatus.COMPLETED.value
    assert body["output_size_bytes"] == len(b"compressed")
    assert body["download_url"] == f"/jobs/{job_id}/download"

    download_response = client.get(f"/jobs/{job_id}/download")
    assert download_response.status_code == 200


def test_job_marks_failed_on_compression_error(client, monkeypatch):
    def fake_run_compression(input_path, output_path, target_size_mb):
        raise CompressionFailedError("動画の圧縮に失敗しました")

    monkeypatch.setattr(job_service, "run_compression", fake_run_compression)

    response = client.post(
        "/jobs", files=_dummy_video_file(), data={"target_size_mb": "9.5"}
    )
    job_id = response.json()["job_id"]

    status_response = client.get(f"/jobs/{job_id}")
    body = status_response.json()
    assert body["status"] == JobStatus.FAILED.value
    assert body["error_message"] == "動画の圧縮に失敗しました"

    download_response = client.get(f"/jobs/{job_id}/download")
    assert download_response.status_code == 409


def test_input_file_deleted_after_success(client, monkeypatch, isolate_dirs):
    upload_dir, _ = isolate_dirs
    monkeypatch.setattr(job_service, "run_compression", lambda i, o, t: o.write_bytes(b"x") or 1)

    response = client.post(
        "/jobs", files=_dummy_video_file(), data={"target_size_mb": "9.5"}
    )
    job_id = response.json()["job_id"]
    job = job_repository.get(job_id)

    assert not job.input_path.exists()
    assert list(upload_dir.iterdir()) == []


def test_input_file_deleted_after_failure(client, monkeypatch, isolate_dirs):
    upload_dir, _ = isolate_dirs

    def fake_run_compression(input_path, output_path, target_size_mb):
        raise CompressionFailedError("failed")

    monkeypatch.setattr(job_service, "run_compression", fake_run_compression)

    response = client.post(
        "/jobs", files=_dummy_video_file(), data={"target_size_mb": "9.5"}
    )
    job_id = response.json()["job_id"]
    job = job_repository.get(job_id)

    assert not job.input_path.exists()
    assert list(upload_dir.iterdir()) == []


def test_incomplete_output_file_deleted_on_failure(client, monkeypatch, isolate_dirs):
    def fake_run_compression(input_path, output_path, target_size_mb):
        output_path.write_bytes(b"partial")
        raise CompressionFailedError("failed after partial write")

    monkeypatch.setattr(job_service, "run_compression", fake_run_compression)

    response = client.post(
        "/jobs", files=_dummy_video_file(), data={"target_size_mb": "9.5"}
    )
    job_id = response.json()["job_id"]
    job = job_repository.get(job_id)

    assert not job.output_path.exists()
