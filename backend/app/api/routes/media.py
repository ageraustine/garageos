from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from typing import List
from app.database import get_db
from app.api.deps import get_current_user, get_storage_service
from app.schemas.media import (
    MediaUploadRequest,
    MediaUploadResponse,
    MediaAssetCreate,
    MediaAssetResponse,
)
from app.services.media_service import MediaService
from app.services.storage_service import StorageService, StorageError
from app.config import settings

router = APIRouter(prefix="/jobs/{job_id}/media", tags=["media"])


@router.post("/upload-url", response_model=MediaUploadResponse)
async def request_upload_url(
    job_id: int,
    data: MediaUploadRequest,
    db: Session = Depends(get_db),
    storage: StorageService = Depends(get_storage_service),
    _: dict = Depends(get_current_user),
):
    """Get presigned URL for direct upload to MinIO."""
    service = MediaService(db, storage)
    try:
        url, key = service.request_upload(job_id, data)
        return MediaUploadResponse(
            upload_url=url,
            object_key=key,
            expires_in=settings.MINIO_PRESIGNED_EXPIRY_SECONDS,
        )
    except StorageError as e:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail=e.message)


@router.post("/", response_model=MediaAssetResponse, status_code=status.HTTP_201_CREATED)
async def confirm_upload(
    job_id: int,
    data: MediaAssetCreate,
    db: Session = Depends(get_db),
    storage: StorageService = Depends(get_storage_service),
    _: dict = Depends(get_current_user),
):
    """Confirm upload complete and create DB record."""
    service = MediaService(db, storage)
    asset = service.confirm_upload(job_id, data)
    return MediaAssetResponse(
        id=asset.id,
        job_id=asset.job_id,
        type=asset.type.value,
        url=asset.url,
        compressed=asset.compressed,
        opened_by_customer_at=asset.opened_by_customer_at,
        created_at=asset.created_at,
    )


@router.get("/", response_model=List[MediaAssetResponse])
async def list_media(
    job_id: int,
    db: Session = Depends(get_db),
    storage: StorageService = Depends(get_storage_service),
    _: dict = Depends(get_current_user),
):
    """List all media assets for a job."""
    service = MediaService(db, storage)
    assets = service.list_by_job(job_id)
    return [
        MediaAssetResponse(
            id=asset.id,
            job_id=asset.job_id,
            type=asset.type.value,
            url=asset.url,
            compressed=asset.compressed,
            opened_by_customer_at=asset.opened_by_customer_at,
            created_at=asset.created_at,
        )
        for asset in assets
    ]
