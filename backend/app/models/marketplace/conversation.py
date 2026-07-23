"""MarketplaceConversation and MarketplaceMessage models."""

from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from enum import Enum

if TYPE_CHECKING:
    from .listing import MarketplaceListing
    from .seller import MarketplaceSeller


class SenderType(str, Enum):
    """Who sent the message."""
    BUYER = "buyer"
    SELLER = "seller"


class MarketplaceConversation(SQLModel, table=True):
    """
    Chat thread between a buyer and seller about a listing.
    """

    __tablename__ = "marketplace_conversations"

    id: Optional[int] = Field(default=None, primary_key=True)
    listing_id: int = Field(foreign_key="marketplace_listings.id", index=True)

    # Buyer can be an employee (logged in) or external (phone/name only)
    buyer_id: Optional[int] = Field(
        default=None, foreign_key="employees.id", index=True
    )
    buyer_phone: Optional[str] = Field(default=None, max_length=20)
    buyer_name: Optional[str] = Field(default=None, max_length=100)

    seller_id: int = Field(foreign_key="marketplace_sellers.id", index=True)

    last_message_at: Optional[datetime] = Field(default=None, index=True)
    is_archived_by_buyer: bool = Field(default=False)
    is_archived_by_seller: bool = Field(default=False)

    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    listing: Optional["MarketplaceListing"] = Relationship(back_populates="conversations")
    seller: Optional["MarketplaceSeller"] = Relationship(back_populates="conversations")
    messages: List["MarketplaceMessage"] = Relationship(back_populates="conversation")


class MarketplaceMessage(SQLModel, table=True):
    """
    Individual message in a conversation.
    """

    __tablename__ = "marketplace_messages"

    id: Optional[int] = Field(default=None, primary_key=True)
    conversation_id: int = Field(foreign_key="marketplace_conversations.id", index=True)

    sender_type: str = Field(max_length=10)  # buyer or seller
    content: str
    is_read: bool = Field(default=False)

    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

    # Relationship
    conversation: Optional["MarketplaceConversation"] = Relationship(
        back_populates="messages"
    )
