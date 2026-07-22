from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class MediaUploadRequest(BaseModel):
    """Request presigned upload URL."""

    media_type: str = Field(pattern=r"^(photo|voice)$")
    content_type: str = Field(pattern=r"^(image|audio)/")


class MediaUploadResponse(BaseModel):
    """Returns presigned URL and object key."""

    upload_url: str
    object_key: str
    expires_in: int


class MediaAssetCreate(BaseModel):
    """Confirm upload complete."""

    object_key: str
    media_type: str = Field(pattern=r"^(photo|voice)$")


class MediaAssetResponse(BaseModel):
    id: int
    job_id: int
    type: str
    url: str
    compressed: bool
    opened_by_customer_at: Optional[datetime]
    created_at: datetime
