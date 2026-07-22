from sqlmodel import SQLModel, Field
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
    geo_lat: Optional[float] = Field(default=None, description="Latitude")
    geo_lng: Optional[float] = Field(default=None, description="Longitude")
    bays: int = Field(default=1, ge=1, description="Number of service bays")
    created_at: datetime = Field(default_factory=datetime.utcnow)
