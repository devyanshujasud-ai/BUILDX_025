import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, Base
from app.routes import (
    detection_router,
    pothole_router,
    authority_router,
    ticket_router,
    asset_router,
    issue_router,
    rfid_router,
    iot_router,
    construction_router,
    budget_router,
    hardware_router,
)
from app.seed import init_and_seed_db

app = FastAPI(
    title="Vikasit Nagpur — Urban Infrastructure Intelligence & Coordination Platform",
    description="AI-powered Road Defect Detection, Multi-Asset GIS Geo-Routing, and Urban Civic Coordination Platform",
    version="2.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve local uploaded files statically
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Routers
app.include_router(detection_router)
app.include_router(pothole_router)
app.include_router(authority_router)
app.include_router(ticket_router)
app.include_router(asset_router)
app.include_router(issue_router)
app.include_router(rfid_router)
app.include_router(iot_router)
app.include_router(construction_router)
app.include_router(budget_router)
app.include_router(hardware_router)

# Auto initialize and seed schema
try:
    init_and_seed_db()
except Exception as e:
    print(f"[Init Warning] Database auto-seed note: {e}")

@app.on_event("startup")
def startup_event():
    """Initializes database tables on startup"""
    try:
        init_and_seed_db()
        print("[Startup] Database tables and seed data verified successfully.")
    except Exception as e:
        print(f"[Startup Error] Table initialization note: {e}")

@app.get("/")
def root():
    return {
        "system": "Vikasit Nagpur — Urban Infrastructure Intelligence & Coordination Platform",
        "status": "Online",
        "version": "2.0.0",
        "docs_url": "/docs",
        "ai_model": "YOLOv8 & Computer Vision Feature Extractor",
        "storage": "AWS S3" if settings.USE_AWS_S3 else "Local Storage"
    }

@app.get("/api/config/status")
def get_config_status():
    """Returns the current database & cloud storage connection status"""
    is_postgres = settings.DATABASE_URL.startswith("postgresql")
    is_s3_ready = bool(settings.AWS_S3_BUCKET_NAME and settings.AWS_ACCESS_KEY_ID)
    
    return {
        "database_type": "PostgreSQL" if is_postgres else "SQLite (Local/Demo)",
        "database_url_masked": settings.DATABASE_URL[:18] + "..." if len(settings.DATABASE_URL) > 18 else settings.DATABASE_URL,
        "aws_s3_configured": is_s3_ready,
        "aws_s3_bucket": settings.AWS_S3_BUCKET_NAME or "Not Configured (Using Local Uploads)",
        "upload_directory": settings.UPLOAD_DIR,
        "supported_authorities": [
            "Nagpur Municipal Corporation (NMC)",
            "NMC PWD (Roads & Bridges)",
            "NMC Electrical & Public Lighting",
            "NMC Solid Waste Management (Sanitation)",
            "NMC Town Planning & Works",
            "Nagpur Smart City (NSSCDCL)",
            "Nagpur Improvement Trust (NIT)",
            "Maha Metro Nagpur",
            "NHAI Nagpur Corridor",
            "Maharashtra State PWD (Nagpur Division)"
        ]
    }
