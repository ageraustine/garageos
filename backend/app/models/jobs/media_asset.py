from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum


class MediaType(str, Enum):
    """Type of media asset."""

    PHOTO = "photo"
    VOICE = "voice"


class MediaAsset(SQLModel, table=True):
    """
    Photos and voice notes attached to jobs.
    opened_by_customer_at feeds Verification Rate trust signal.
    """

    __tablename__ = "media_assets"

    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="jobs.id", index=True)
    type: MediaType
    url: str = Field(max_length=500, description="S3/MinIO object URL")
    compressed: bool = Field(default=False)
    opened_by_customer_at: Optional[datetime] = Field(
        default=None, description="Tracks customer engagement for trust score"
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
