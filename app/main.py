from fastapi import FastAPI

from app.routers import compression, downloads, health, jobs

app = FastAPI(title="Discord Video Compressor API")

app.include_router(health.router)
app.include_router(compression.router)
app.include_router(downloads.router)
app.include_router(jobs.router)
