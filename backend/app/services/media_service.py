from sqlmodel import Session, select
from datetime import datetime, timezone
from typing import Optional
from app.models.media_asset import MediaAsset, MediaType
from app.services.storage_service import StorageService
from app.schemas.media import MediaUploadRequest, MediaAssetCreate
from app.core.exceptions import NotFoundError


class MediaService:
    """Media upload coordination - links storage to DB."""

    def __init__(self, db: Session, storage: Optional[StorageService] = None):
        self.db = db
        self.storage = storage

    def request_upload(
        self, job_id: int, data: MediaUploadRequest
    ) -> tuple[str, str]:
        """Request presigned upload URL. Returns (url, object_key)."""
        return self.storage.generate_presigned_upload_url(
            job_id=job_id,
            media_type=data.media_type,
            content_type=data.content_type,
        )

    def confirm_upload(self, job_id: int, data: MediaAssetCreate) -> MediaAsset:
        """Confirm upload complete and create DB record."""
        url = self.storage.get_object_url(data.object_key)

        asset = MediaAsset(
            job_id=job_id,
            type=MediaType(data.media_type),
            url=url,
            compressed=False,  # Will be set by background worker
        )
        self.db.add(asset)
        self.db.commit()
        self.db.refresh(asset)
        return asset

    def get_by_id(self, id: int) -> MediaAsset:
        asset = self.db.get(MediaAsset, id)
        if not asset:
            raise NotFoundError(f"Media asset {id} not found")
        return asset

    def list_by_job(self, job_id: int) -> list[MediaAsset]:
        return list(
            self.db.exec(select(MediaAsset).where(MediaAsset.job_id == job_id)).all()
        )

    def get_viewable_url(self, asset: MediaAsset) -> str:
        """Generate a presigned URL for viewing the media asset."""
        if not self.storage:
            return asset.url
        # Extract object key from stored URL
        # URL format: http://endpoint/bucket/jobs/123/photo/uuid.jpg
        # We need: jobs/123/photo/uuid.jpg
        url_parts = asset.url.split(f"/{self.storage.bucket}/")
        if len(url_parts) == 2:
            object_key = url_parts[1]
            return self.storage.generate_presigned_download_url(object_key)
        return asset.url

    def mark_opened_by_customer(self, id: int) -> MediaAsset:
        """Track customer viewing for Verification Rate trust signal."""
        asset = self.get_by_id(id)
        if asset.opened_by_customer_at is None:
            asset.opened_by_customer_at = datetime.now(timezone.utc)
            self.db.commit()
            self.db.refresh(asset)
        return asset
