import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.config import (
    ALLOWED_EXTENSIONS,
    DEFAULT_TARGET_SIZE_MB,
    MAX_UPLOAD_SIZE_BYTES,
    OUTPUT_DIR,
    UPLOAD_CHUNK_SIZE_BYTES,
    UPLOAD_DIR,
)
from app.schemas.compression import CompressResponse
from app.services.compressor import (
    CompressionFailedError,
    CompressionTimeoutError,
    compress_video,
)

router = APIRouter()


@router.post("/compress", response_model=CompressResponse)
async def compress_endpoint(
    file: UploadFile = File(...),
    target_size_mb: float = Form(DEFAULT_TARGET_SIZE_MB),
) -> CompressResponse:
    if target_size_mb <= 0:
        raise HTTPException(status_code=400, detail="target_size_mbは0より大きい値を指定してください")

    extension = Path(file.filename or "").suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"対応していないファイル形式です: {extension or '(不明)'}")

    file_id = uuid.uuid4().hex
    input_path = UPLOAD_DIR / f"{file_id}{extension}"
    output_filename = f"{file_id}.mp4"
    output_path = OUTPUT_DIR / output_filename

    try:
        total_bytes = 0
        try:
            with input_path.open("wb") as buffer:
                while chunk := await file.read(UPLOAD_CHUNK_SIZE_BYTES):
                    total_bytes += len(chunk)
                    if total_bytes > MAX_UPLOAD_SIZE_BYTES:
                        raise HTTPException(
                            status_code=413,
                            detail="ファイルサイズが上限(500MB)を超えています",
                        )
                    buffer.write(chunk)
        finally:
            await file.close()

        original_size_bytes = input_path.stat().st_size

        try:
            compress_video(input_path, output_path, target_size_mb)
        except CompressionTimeoutError as exc:
            raise HTTPException(status_code=504, detail=str(exc)) from exc
        except CompressionFailedError as exc:
            raise HTTPException(status_code=500, detail=str(exc)) from exc

        if not output_path.is_file():
            raise HTTPException(status_code=500, detail="出力ファイルが生成されませんでした")

        output_size_bytes = output_path.stat().st_size
        if output_size_bytes <= 0:
            raise HTTPException(status_code=500, detail="出力ファイルが空です")

        target_size_bytes = round(target_size_mb * 1_000_000)
        if output_size_bytes > target_size_bytes:
            raise HTTPException(
                status_code=500,
                detail="圧縮後のファイルサイズが目標サイズを超過しました",
            )
    finally:
        input_path.unlink(missing_ok=True)

    return CompressResponse(
        status="completed",
        filename=output_filename,
        download_url=f"/download/{output_filename}",
        original_size_bytes=original_size_bytes,
        output_size_bytes=output_size_bytes,
        target_size_bytes=target_size_bytes,
    )
