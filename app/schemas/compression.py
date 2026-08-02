from pydantic import BaseModel


class CompressResponse(BaseModel):
    status: str
    filename: str
    download_url: str
    original_size_bytes: int
    output_size_bytes: int
    target_size_bytes: int
