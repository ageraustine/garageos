"""Marketplace listing schemas."""

from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
from typing import Optional, List


class ListingImageResponse(BaseModel):
    """Image in a listing."""

    id: int
    url: str
    sort_order: int
    is_primary: bool


class ListingCreate(BaseModel):
    """Create a new listing."""

    category_id: int
    title: str = Field(min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    price: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    currency: str = Field(default="KES", max_length=3)
    condition: str = Field(default="new", pattern=r"^(new|used|refurbished)$")

    # Vehicle compatibility (optional)
    vehicle_make: Optional[str] = Field(None, max_length=50)
    vehicle_model: Optional[str] = Field(None, max_length=50)
    vehicle_year_from: Optional[int] = Field(None, ge=1900, le=2100)
    vehicle_year_to: Optional[int] = Field(None, ge=1900, le=2100)

    # Product details
    part_number: Optional[str] = Field(None, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    quantity_available: int = Field(default=1, ge=1)

    is_negotiable: bool = False


class ListingUpdate(BaseModel):
    """Update a listing."""

    category_id: Optional[int] = None
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    price: Optional[Decimal] = Field(None, gt=0, max_digits=12, decimal_places=2)
    condition: Optional[str] = Field(None, pattern=r"^(new|used|refurbished)$")

    vehicle_make: Optional[str] = Field(None, max_length=50)
    vehicle_model: Optional[str] = Field(None, max_length=50)
    vehicle_year_from: Optional[int] = Field(None, ge=1900, le=2100)
    vehicle_year_to: Optional[int] = Field(None, ge=1900, le=2100)

    part_number: Optional[str] = Field(None, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    quantity_available: Optional[int] = Field(None, ge=0)

    is_negotiable: Optional[bool] = None
    is_active: Optional[bool] = None


class ListingSellerInfo(BaseModel):
    """Seller info embedded in listing response."""

    id: int
    name: str
    logo_url: Optional[str]
    phone: str
    whatsapp: Optional[str]
    city: Optional[str]
    is_verified: bool


class ListingCategoryInfo(BaseModel):
    """Category info embedded in listing response."""

    id: int
    name: str
    slug: str


class ListingResponse(BaseModel):
    """Full listing detail response."""

    id: int
    seller_id: int
    category_id: int
    title: str
    description: Optional[str]
    price: Decimal
    currency: str
    condition: str

    vehicle_make: Optional[str]
    vehicle_model: Optional[str]
    vehicle_year_from: Optional[int]
    vehicle_year_to: Optional[int]

    part_number: Optional[str]
    brand: Optional[str]
    quantity_available: int

    is_negotiable: bool
    is_active: bool
    views_count: int

    created_at: datetime
    updated_at: datetime

    # Embedded info
    seller: ListingSellerInfo
    category: ListingCategoryInfo
    images: List[ListingImageResponse] = []


class ListingListItem(BaseModel):
    """Listing item for list/grid view."""

    id: int
    title: str
    price: Decimal
    currency: str
    condition: str
    vehicle_make: Optional[str]
    vehicle_model: Optional[str]
    is_negotiable: bool
    is_active: bool
    views_count: int
    created_at: datetime

    # Primary image only
    primary_image_url: Optional[str]

    # Seller summary
    seller_id: int
    seller_name: str
    seller_city: Optional[str]
    seller_is_verified: bool

    # Category
    category_name: str


class ListingImageUploadRequest(BaseModel):
    """Request upload URL for listing image."""

    content_type: str = Field(pattern=r"^image/(jpeg|png|webp|gif)$")


class ListingImageConfirm(BaseModel):
    """Confirm image upload."""

    object_key: str
    is_primary: bool = False


class ListingSearchParams(BaseModel):
    """Search parameters for listings."""

    search: Optional[str] = None
    category_id: Optional[int] = None
    seller_id: Optional[int] = None
    condition: Optional[str] = Field(None, pattern=r"^(new|used|refurbished)$")
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    vehicle_make: Optional[str] = None
    vehicle_model: Optional[str] = None
    city: Optional[str] = None
    sort: str = Field(default="newest", pattern=r"^(newest|price_asc|price_desc)$")
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)
