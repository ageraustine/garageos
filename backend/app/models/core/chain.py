from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from typing import Optional, List


class Chain(SQLModel, table=True):
    """
    Top-level tenant organization (garage chain).

    The 'name' field is the globally unique slug (like @username).
    Example: 'autofix-kenya', 'quickserv-nairobi'
    """

    __tablename__ = "chains"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(
        unique=True,
        index=True,
        min_length=3,
        max_length=30,
        description="Unique URL-safe slug (lowercase, alphanumeric, hyphens)",
    )
    display_name: str = Field(
        max_length=100,
        description="Human-readable garage name shown in UI",
    )
    currency: str = Field(
        default="KES",
        max_length=10,
        description="Currency code (e.g., KES, USD, TZS, UGX)",
    )
    branding: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSONB),
        description="Logo URL, colors for white-label theming",
    )
    commission_formula: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSONB),
        description="Custom commission calculation rules",
    )

    # ═══════════════════════════════════════════════════════════════════
    # PUBLIC PROFILE - Mini website for each garage
    # ═══════════════════════════════════════════════════════════════════

    # Hero section
    tagline: Optional[str] = Field(
        default=None,
        max_length=150,
        description="Short catchy slogan, e.g. 'Your car deserves the best'",
    )
    cover_image_url: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Hero banner image URL",
    )

    # About section
    description: Optional[str] = Field(
        default=None,
        max_length=5000,
        description="Rich description of the garage (supports markdown)",
    )
    year_established: Optional[int] = Field(
        default=None,
        description="Year the garage was founded",
    )
    specialties: Optional[List[str]] = Field(
        default=None,
        sa_column=Column(JSONB),
        description="List of specialties, e.g. ['German Cars', 'Hybrid Vehicles', 'Fleet Service']",
    )

    # Contact info
    phone: Optional[str] = Field(
        default=None,
        max_length=20,
        description="Primary contact phone",
    )
    whatsapp: Optional[str] = Field(
        default=None,
        max_length=20,
        description="WhatsApp number for quick contact",
    )
    email: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Contact email",
    )

    # Location
    address: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Main address (HQ or primary branch)",
    )
    city: Optional[str] = Field(
        default=None,
        max_length=100,
        index=True,
        description="City for filtering/search",
    )

    # Online presence
    website: Optional[str] = Field(
        default=None,
        max_length=200,
        description="External website URL",
    )
    social_links: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSONB),
        description="Social media links: {facebook, instagram, twitter, tiktok, youtube}",
    )

    # Gallery
    gallery_images: Optional[List[str]] = Field(
        default=None,
        sa_column=Column(JSONB),
        description="List of gallery image URLs",
    )

    # Operating hours (default for all branches)
    operating_hours: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSONB),
        description="Weekly hours: {mon: '8:00-18:00', tue: '8:00-18:00', ...}",
    )

    # Visibility
    is_public: bool = Field(
        default=False,
        index=True,
        description="Whether garage is listed in public directory",
    )
    is_featured: bool = Field(
        default=False,
        index=True,
        description="Featured garages appear first in listings",
    )

    created_at: datetime = Field(default_factory=datetime.utcnow)
