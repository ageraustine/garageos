"""Schemas for public-facing garage profiles."""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class BranchPublic(BaseModel):
    """Public branch information."""

    id: int
    name: str
    address: Optional[str] = None
    city: Optional[str] = None
    geo_lat: Optional[float] = None
    geo_lng: Optional[float] = None
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    operating_hours: Optional[dict] = None
    image_url: Optional[str] = None
    bays: int


class ServicePublic(BaseModel):
    """Public service information."""

    id: int
    name: str
    description: Optional[str] = None
    stages: List[str] = []


class GarageListItem(BaseModel):
    """Garage summary for listings."""

    id: int
    slug: str  # name field
    display_name: str
    tagline: Optional[str] = None
    logo_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    city: Optional[str] = None
    specialties: Optional[List[str]] = None
    branch_count: int = 0
    is_featured: bool = False
    year_established: Optional[int] = None


class GarageProfile(BaseModel):
    """Full public garage profile - the mini website."""

    id: int
    slug: str
    display_name: str

    # Hero
    tagline: Optional[str] = None
    logo_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    primary_color: Optional[str] = None
    accent_color: Optional[str] = None

    # About
    description: Optional[str] = None
    year_established: Optional[int] = None
    specialties: Optional[List[str]] = None

    # Contact
    phone: Optional[str] = None
    whatsapp: Optional[str] = None
    email: Optional[str] = None

    # Location
    address: Optional[str] = None
    city: Optional[str] = None

    # Online presence
    website: Optional[str] = None
    social_links: Optional[dict] = None

    # Gallery
    gallery_images: Optional[List[str]] = None

    # Operating hours
    operating_hours: Optional[dict] = None

    # Stats (computed)
    branch_count: int = 0
    total_jobs_completed: int = 0
    years_in_business: Optional[int] = None

    # Related data
    branches: List[BranchPublic] = []
    services: List[ServicePublic] = []

    is_featured: bool = False
    created_at: datetime


class GarageListResponse(BaseModel):
    """Paginated list of garages."""

    items: List[GarageListItem]
    total: int
    limit: int
    offset: int
