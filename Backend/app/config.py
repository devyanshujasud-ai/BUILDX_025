import os
from typing import List
from pydantic_settings import BaseSettings

# Backend/ directory — one level up from app/
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Project root — one level above Backend/
BASE_DIR = os.path.dirname(BACKEND_DIR)

class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ]

    # PostgreSQL / SQLite URL
    DATABASE_URL: str = "sqlite:///./potholes.db"

    # AWS S3 Settings
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    AWS_S3_BUCKET_NAME: str = "potholes-223"
    AWS_S3_UPLOAD_PREFIX: str = "potholes"
    USE_AWS_S3: bool = False
    AWS_S3_FALLBACK_TO_LOCAL: bool = True

    # Notification Settings
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = "" 
    SMTP_PASSWORD: str = ""
    NOTIFICATION_SENDER_EMAIL: str = "alerts@civicroads.gov.in"

    # AI Detection Settings
    MODEL_PATH: str = "weights/yolov8_pothole.pt"
    CONFIDENCE_THRESHOLD: float = 0.35
    IOU_THRESHOLD: float = 0.45

    # Storage Directory (uploads/ sits next to Backend/)
    UPLOAD_DIR: str = os.path.join(BASE_DIR, "uploads")

    class Config:
        # Look for .env in Backend/ first, fall back to project root
        env_file = (
            os.path.join(BACKEND_DIR, ".env"),
            os.path.join(BASE_DIR, ".env"),
        )
        extra = "ignore"

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

