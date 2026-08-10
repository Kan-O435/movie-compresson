from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from app.config import OUTPUT_DIR

router = APIRouter()


@router.get("/download/{filename}")
async def download(filename: str) -> FileResponse:
    safe_name = Path(filename).name
    file_path = OUTPUT_DIR / safe_name

    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="ファイルが見つかりません")

    return FileResponse(
        path=file_path,
        media_type="video/mp4",
        filename=safe_name,
    )
