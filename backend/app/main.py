import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.routes.intake import router as intake_router
from app.routes.triage import router as triage_router
from app.routes.map import router as map_router
from app.routes.camps import router as camps_router
from app.routes.audit import router as audit_router
from app.routes.reunification import router as reunification_router
from app.routes.early_warning import router as early_warning_router
from app.routes.field_sync import router as field_sync_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="ResqNet AI - Multilingual Voice SOS Intake, DVS Triage Queue & Water Zonation Map Engine"
)

# CORS middleware for React/Frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(intake_router)
app.include_router(triage_router)
app.include_router(map_router)
app.include_router(camps_router)
app.include_router(audit_router)
app.include_router(reunification_router)
app.include_router(early_warning_router)
app.include_router(field_sync_router)

# Mount static files for control room dashboard
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.get("/")
@app.get("/dashboard")
def get_dashboard():
    """Serves the interactive Control Room Dashboard UI."""
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {
        "service": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "operational",
        "docs_url": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
