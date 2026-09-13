import os
import uuid
import boto3
from botocore.exceptions import BotoCoreError, ClientError, NoCredentialsError
from fastapi import HTTPException
from app.config import settings

class StorageService:
    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        os.makedirs(self.upload_dir, exist_ok=True)
        self.use_s3 = settings.USE_AWS_S3 and bool(settings.AWS_S3_BUCKET_NAME)
        self.s3_client = None
        
        if settings.USE_AWS_S3 and not settings.AWS_S3_BUCKET_NAME:
            raise RuntimeError("USE_AWS_S3=true but AWS_S3_BUCKET_NAME is empty.")

        if self.use_s3:
            try:
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
                    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
                    region_name=settings.AWS_REGION or 'us-east-1'
                )
            except Exception as e:
                raise RuntimeError(
                    "AWS S3 is enabled but the S3 client could not be initialized. "
                    "Check AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, and AWS_S3_BUCKET_NAME."
                ) from e

    def _save_local_bytes(self, file_bytes: bytes, unique_name: str) -> str:
        local_path = os.path.join(self.upload_dir, unique_name)
        with open(local_path, "wb") as f:
            f.write(file_bytes)

        return f"/uploads/{unique_name}"

    def _s3_url(self, key: str) -> str:
        region = settings.AWS_REGION or "us-east-1"
        if region == "us-east-1":
            return f"https://{settings.AWS_S3_BUCKET_NAME}.s3.amazonaws.com/{key}"
        return f"https://{settings.AWS_S3_BUCKET_NAME}.s3.{region}.amazonaws.com/{key}"

    def _s3_error_detail(self, error: Exception, key: str) -> str:
        bucket = settings.AWS_S3_BUCKET_NAME
        action = "s3:PutObject"
        resource = f"arn:aws:s3:::{bucket}/{key}"
        detail = (
            "AWS S3 upload failed. The configured AWS principal is not allowed "
            f"to upload objects. Grant {action} on {resource}, or set "
            "AWS_S3_FALLBACK_TO_LOCAL=true / USE_AWS_S3=false for local development."
        )

        if isinstance(error, ClientError):
            aws_error = error.response.get("Error", {})
            code = aws_error.get("Code")
            message = aws_error.get("Message")
            if code or message:
                detail = f"{detail} AWS error: {code or 'Unknown'} - {message or error}"
        else:
            detail = f"{detail} Error: {error}"

        return detail

    def save_bytes(self, file_bytes: bytes, filename: str, content_type: str = "image/jpeg") -> str:
        """Saves file to local storage so it is guaranteed to be viewable, and optionally backs up to S3."""
        ext = os.path.splitext(filename)[1] or ".jpg"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        upload_prefix = (settings.AWS_S3_UPLOAD_PREFIX or "potholes").strip("/")
        s3_key = f"{upload_prefix}/{unique_name}" if upload_prefix else unique_name
        
        # 1. Always save a local copy so images are guaranteed to be served via FastAPI /uploads/
        local_url = self._save_local_bytes(file_bytes, unique_name)

        # 2. If S3 is configured, upload to S3 as cloud backup
        if self.use_s3 and self.s3_client and settings.AWS_S3_BUCKET_NAME:
            try:
                self.s3_client.put_object(
                    Bucket=settings.AWS_S3_BUCKET_NAME,
                    Key=s3_key,
                    Body=file_bytes,
                    ContentType=content_type
                )
                return self._s3_url(s3_key)
            except (BotoCoreError, ClientError, NoCredentialsError) as e:
                print(f"[Storage Warning] S3 upload failed: {e}")
                if not settings.AWS_S3_FALLBACK_TO_LOCAL:
                    raise HTTPException(
                        status_code=503,
                        detail=self._s3_error_detail(e, s3_key),
                    ) from e
                
        return local_url

    def save_file(self, file_path: str) -> str:
        """Reads local file and uploads/copies it"""
        with open(file_path, "rb") as f:
            return self.save_bytes(f.read(), os.path.basename(file_path))

storage_service = StorageService()
