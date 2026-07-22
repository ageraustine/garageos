"""Branch schemas for CRUD operations."""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class BranchCreate(BaseModel):
    """Request to create a branch."""

    name: str = Field(min_length=2, max_length=100)
    bays: int = Field(default=1, ge=1)
    geo_lat: Optional[float] = None
    geo_lng: Optional[float] = None


class BranchUpdate(BaseModel):
    """Request to update a branch."""

    name: Optional[str] = Field(None, min_length=2, max_length=100)
    bays: Optional[int] = Field(None, ge=1)
    geo_lat: Optional[float] = None
    geo_lng: Optional[float] = None


class BranchResponse(BaseModel):
    """Branch response with employee count."""

    id: int
    name: str
    bays: int
    geo_lat: Optional[float]
    geo_lng: Optional[float]
    employee_count: int = 0
    created_at: datetime


class BranchListItem(BaseModel):
    """Minimal branch info for dropdowns."""

    id: int
    name: str
