"""MarketplaceListing and MarketplaceListingImage models."""

from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from decimal import Decimal
from typing import Optional, List, TYPE_CHECKING
from enum import Enum

if TYPE_CHECKING:
    from .seller import MarketplaceSeller
    from .category import MarketplaceCategory
    from .conversation import MarketplaceConversation


class ListingCondition(str, Enum):
    """Condition of the item."""
    NEW = "new"
    USED = "used"
    REFURBISHED = "refurbished"


class MarketplaceListing(SQLModel, table=True):
    """
    Individual product listing in the marketplace.
    """

    __tablename__ = "marketplace_listings"

    id: Optional[int] = Field(default=None, primary_key=True)
    seller_id: int = Field(foreign_key="marketplace_sellers.id", index=True)
    category_id: int = Field(foreign_key="marketplace_categories.id", index=True)

    title: str = Field(max_length=200)
    description: Optional[str] = Field(default=None)
    price: Decimal = Field(max_digits=12, decimal_places=2)
    currency: str = Field(default="KES", max_length=3)
    condition: str = Field(default="new", max_length=20, index=True)

    # Vehicle compatibility (optional)
    vehicle_make: Optional[str] = Field(default=None, max_length=50)
    vehicle_model: Optional[str] = Field(default=None, max_length=50)
    vehicle_year_from: Optional[int] = Field(default=None)
    vehicle_year_to: Optional[int] = Field(default=None)

    # Product details
    part_number: Optional[str] = Field(default=None, max_length=100)
    brand: Optional[str] = Field(default=None, max_length=100)
    quantity_available: int = Field(default=1)

    is_negotiable: bool = Field(default=False)
    is_active: bool = Field(default=True, index=True)
    views_count: int = Field(default=0)

    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = Field(default=None)

    # Relationships
    seller: Optional["MarketplaceSeller"] = Relationship(back_populates="listings")
    category: Optional["MarketplaceCategory"] = Relationship(back_populates="listings")
    images: List["MarketplaceListingImage"] = Relationship(back_populates="listing")
    conversations: List["MarketplaceConversation"] = Relationship(back_populates="listing")


class MarketplaceListingImage(SQLModel, table=True):
    """
    Images for a marketplace listing.
    Multiple images per listing, one can be primary.
    """

    __tablename__ = "marketplace_listing_images"

    id: Optional[int] = Field(default=None, primary_key=True)
    listing_id: int = Field(foreign_key="marketplace_listings.id", index=True)
    url: str = Field(max_length=500)
    sort_order: int = Field(default=0)
    is_primary: bool = Field(default=False)

    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationship
    listing: Optional["MarketplaceListing"] = Relationship(back_populates="images")
