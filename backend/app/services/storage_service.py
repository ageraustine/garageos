from minio import Minio
from minio.error import S3Error
from datetime import timedelta
from typing import Optional
import uuid
from app.config import settings
from app.core.exceptions import AppException


class StorageError(AppException):
    """Storage operation failed."""

    pass


class StorageService:
    """
    S3-compatible object storage via MinIO.

    Single Responsibility: file upload/download operations only.
    """

    def __init__(self, client: Optional[Minio] = None):
        self.client = client or Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_SECURE,
        )
        self.bucket = settings.MINIO_BUCKET
        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        """Create bucket if it doesn't exist."""
        try:
            if not self.client.bucket_exists(self.bucket):
                self.client.make_bucket(self.bucket)
        except S3Error as e:
            # Don't fail on bucket check errors during startup
            pass

    def generate_presigned_upload_url(
        self, job_id: int, media_type: str, content_type: str = "application/octet-stream"
    ) -> tuple[str, str]:
        """
        Generate presigned URL for direct upload.
        Returns (presigned_url, object_key).
        """
        ext = self._get_extension(content_type)
        object_key = f"jobs/{job_id}/{media_type}/{uuid.uuid4()}{ext}"

        try:
            url = self.client.presigned_put_object(
                self.bucket,
                object_key,
                expires=timedelta(seconds=settings.MINIO_PRESIGNED_EXPIRY_SECONDS),
            )
            return url, object_key
        except S3Error as e:
            raise StorageError(f"Failed to generate upload URL: {e}")

    def generate_presigned_download_url(self, object_key: str) -> str:
        """Generate presigned URL for download."""
        try:
            return self.client.presigned_get_object(
                self.bucket,
                object_key,
                expires=timedelta(seconds=settings.MINIO_PRESIGNED_EXPIRY_SECONDS),
            )
        except S3Error as e:
            raise StorageError(f"Failed to generate download URL: {e}")

    def get_object_url(self, object_key: str) -> str:
        """Get permanent internal URL for storage in DB."""
        protocol = "https" if settings.MINIO_SECURE else "http"
        return f"{protocol}://{settings.MINIO_ENDPOINT}/{self.bucket}/{object_key}"

    def _get_extension(self, content_type: str) -> str:
        """Map content type to file extension."""
        mapping = {
            "image/jpeg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
            "audio/mpeg": ".mp3",
            "audio/wav": ".wav",
            "audio/ogg": ".ogg",
            "audio/webm": ".webm",
        }
        return mapping.get(content_type, "")
