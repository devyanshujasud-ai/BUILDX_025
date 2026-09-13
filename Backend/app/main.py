import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import engine, Base
from app.routes import detection_router, pothole_router, authority_router, ticket_router

app = FastAPI(
    title="Pothole Detection & Civic Reporting System API",
    description="AI-powered Pothole Detection, GIS Geo-Routing, and Civic Authority Ticketing System",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
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

@app.on_event("startup")
def startup_event():
    """Initializes database tables on startup"""
    try:
        Base.metadata.create_all(bind=engine)
        print("[Startup] Database tables verified/created successfully.")
    except Exception as e:
        print(f"[Startup Error] Table initialization note: {e}")

@app.get("/")
def root():
    return {
        "system": "Pothole Detection & Civic Reporting System API",
        "status": "Online",
        "version": "1.0.0",
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
        "supported_authorities": ["MCD North", "MCD South", "MCD East", "NDMC", "PWD Delhi", "NHAI", "DDA", "BBMP"]
    }
