from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from typing import Optional


class Branch(SQLModel, table=True):
    """
    Individual shop/location within a chain.

    Note: Trust Score is NOT stored here - it's computed on read
    from completed, paid jobs (per CLAUDE.md invariant #1).
    """

    __tablename__ = "branches"

    id: Optional[int] = Field(default=None, primary_key=True)
    chain_id: int = Field(foreign_key="chains.id", index=True)
    name: str = Field(max_length=100, description="Branch name, e.g. 'Westlands', 'CBD'")

    # Location
    address: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Full street address",
    )
    city: Optional[str] = Field(
        default=None,
        max_length=100,
        description="City name",
    )
    geo_lat: Optional[float] = Field(default=None, description="Latitude")
    geo_lng: Optional[float] = Field(default=None, description="Longitude")

    # Contact
    phone: Optional[str] = Field(
        default=None,
        max_length=20,
        description="Branch phone number",
    )
    whatsapp: Optional[str] = Field(
        default=None,
        max_length=20,
        description="Branch WhatsApp",
    )

    # Capacity & hours
    bays: int = Field(default=1, ge=1, description="Number of service bays")
    operating_hours: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSONB),
        description="Branch-specific hours (overrides chain default)",
    )

    # Visual
    image_url: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Photo of the branch location",
    )

    is_active: bool = Field(default=True, description="Whether branch is operational")
    created_at: datetime = Field(default_factory=datetime.utcnow)
