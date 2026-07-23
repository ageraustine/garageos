"""MarketplaceSeller model - seller profiles for marketplace."""

from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from enum import Enum

if TYPE_CHECKING:
    from .listing import MarketplaceListing
    from .conversation import MarketplaceConversation


class SellerType(str, Enum):
    """Type of seller."""
    CHAIN = "chain"  # GarageOS registered chain
    EXTERNAL = "external"  # External seller


class MarketplaceSeller(SQLModel, table=True):
    """
    Seller profile in the marketplace.
    Can be linked to a GarageOS chain or be an external seller.
    """

    __tablename__ = "marketplace_sellers"

    id: Optional[int] = Field(default=None, primary_key=True)
    seller_type: str = Field(max_length=20)  # chain or external
    chain_id: Optional[int] = Field(default=None, foreign_key="chains.id", index=True)

    name: str = Field(max_length=200)
    description: Optional[str] = Field(default=None)
    logo_url: Optional[str] = Field(default=None, max_length=500)

    phone: str = Field(max_length=20)
    email: Optional[str] = Field(default=None, max_length=200)
    whatsapp: Optional[str] = Field(default=None, max_length=20)

    location: Optional[str] = Field(default=None, max_length=500)
    city: Optional[str] = Field(default=None, max_length=100, index=True)

    is_verified: bool = Field(default=False)
    is_active: bool = Field(default=True, index=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    listings: List["MarketplaceListing"] = Relationship(back_populates="seller")
    conversations: List["MarketplaceConversation"] = Relationship(back_populates="seller")
