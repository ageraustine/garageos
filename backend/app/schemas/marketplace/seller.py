"""Marketplace seller schemas."""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class SellerCreate(BaseModel):
    """Create a new seller profile."""

    seller_type: str = Field(pattern=r"^(chain|external)$")
    chain_id: Optional[int] = None  # Required if seller_type is "chain"
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    phone: str = Field(min_length=10, max_length=20)
    email: Optional[str] = Field(None, max_length=200)
    whatsapp: Optional[str] = Field(None, max_length=20)
    location: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)


class SellerUpdate(BaseModel):
    """Update seller profile."""

    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    logo_url: Optional[str] = Field(None, max_length=500)
    phone: Optional[str] = Field(None, min_length=10, max_length=20)
    email: Optional[str] = Field(None, max_length=200)
    whatsapp: Optional[str] = Field(None, max_length=20)
    location: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    is_active: Optional[bool] = None


class SellerResponse(BaseModel):
    """Full seller profile response."""

    id: int
    seller_type: str
    chain_id: Optional[int]
    name: str
    description: Optional[str]
    logo_url: Optional[str]
    phone: str
    email: Optional[str]
    whatsapp: Optional[str]
    location: Optional[str]
    city: Optional[str]
    is_verified: bool
    is_active: bool
    listings_count: int = 0
    created_at: datetime


class SellerListItem(BaseModel):
    """Seller item for list view."""

    id: int
    seller_type: str
    name: str
    logo_url: Optional[str]
    city: Optional[str]
    is_verified: bool
    listings_count: int = 0
