"""MarketplaceCategory model - hierarchical categories for listings."""

from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING

if TYPE_CHECKING:
    from .listing import MarketplaceListing


class MarketplaceCategory(SQLModel, table=True):
    """
    Hierarchical categories for marketplace listings.
    E.g., Engine Parts > Pistons & Rings
    """

    __tablename__ = "marketplace_categories"

    id: Optional[int] = Field(default=None, primary_key=True)
    parent_id: Optional[int] = Field(
        default=None, foreign_key="marketplace_categories.id", index=True
    )

    name: str = Field(max_length=100)
    slug: str = Field(max_length=100, index=True)
    icon: Optional[str] = Field(default=None, max_length=50)
    sort_order: int = Field(default=0)
    is_active: bool = Field(default=True, index=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Self-referential relationship for parent/children
    children: List["MarketplaceCategory"] = Relationship(
        back_populates="parent",
        sa_relationship_kwargs={"foreign_keys": "[MarketplaceCategory.parent_id]"},
    )
    parent: Optional["MarketplaceCategory"] = Relationship(
        back_populates="children",
        sa_relationship_kwargs={
            "foreign_keys": "[MarketplaceCategory.parent_id]",
            "remote_side": "[MarketplaceCategory.id]",
        },
    )

    # Listings in this category
    listings: List["MarketplaceListing"] = Relationship(back_populates="category")
