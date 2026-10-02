import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.app.config import settings
from backend.app.database import init_db
from backend.app.scheduler import start_scheduler, stop_scheduler
from backend.app.routers import auth, tasks, categories, notifications, users

is_serverless = bool(os.environ.get("VERCEL"))

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize DB
    init_db()
    if not is_serverless and settings.ENABLE_BACKGROUND_SCHEDULER:
        start_scheduler()
    yield
    # Shutdown: Stop background scheduler if running
    if not is_serverless and settings.ENABLE_BACKGROUND_SCHEDULER:
        stop_scheduler()

app = FastAPI(
    title="Daywise API",
    description="Mobile-first To-Do List Application Backend",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(categories.router)
app.include_router(notifications.router)
app.include_router(users.router)

@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app": "Daywise",
        "version": "1.0.0",
        "database": "connected",
        "smtp_configured": settings.is_smtp_configured,
        "environment": settings.ENVIRONMENT
    }

# Mount Frontend Static Assets
BASE_DIR = Path(__file__).resolve().parent.parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

if FRONTEND_DIR.exists():
    app.mount("/css", StaticFiles(directory=str(FRONTEND_DIR / "css")), name="css")
    app.mount("/js", StaticFiles(directory=str(FRONTEND_DIR / "js")), name="js")
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR / "assets")), name="assets")

    @app.get("/")
    def serve_frontend_index():
        return FileResponse(str(FRONTEND_DIR / "index.html"))

    @app.get("/manifest.json")
    def serve_manifest():
        manifest_path = FRONTEND_DIR / "manifest.json"
        if manifest_path.exists():
            return FileResponse(str(manifest_path), media_type="application/manifest+json")
        return {}
