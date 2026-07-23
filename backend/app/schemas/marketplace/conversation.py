"""Marketplace conversation and message schemas."""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class ConversationCreate(BaseModel):
    """Start a new conversation about a listing."""

    listing_id: int
    message: str = Field(min_length=1, max_length=2000)
    # For external buyers (not logged in)
    buyer_phone: Optional[str] = Field(None, min_length=10, max_length=20)
    buyer_name: Optional[str] = Field(None, max_length=100)


class MessageCreate(BaseModel):
    """Send a message in a conversation."""

    content: str = Field(min_length=1, max_length=2000)


class MessageResponse(BaseModel):
    """Message in a conversation."""

    id: int
    sender_type: str  # buyer or seller
    content: str
    is_read: bool
    created_at: datetime


class ConversationListingInfo(BaseModel):
    """Listing info embedded in conversation."""

    id: int
    title: str
    price: float
    primary_image_url: Optional[str]


class ConversationSellerInfo(BaseModel):
    """Seller info in conversation."""

    id: int
    name: str
    logo_url: Optional[str]


class ConversationBuyerInfo(BaseModel):
    """Buyer info in conversation."""

    id: Optional[int]  # Employee ID if logged in
    name: Optional[str]
    phone: Optional[str]


class ConversationResponse(BaseModel):
    """Full conversation with messages."""

    id: int
    listing: ConversationListingInfo
    seller: ConversationSellerInfo
    buyer: ConversationBuyerInfo
    messages: List[MessageResponse] = []
    last_message_at: Optional[datetime]
    unread_count: int = 0
    created_at: datetime


class ConversationListItem(BaseModel):
    """Conversation item for inbox list."""

    id: int
    listing_id: int
    listing_title: str
    listing_image_url: Optional[str]

    # Other party
    other_party_name: str
    other_party_logo_url: Optional[str]

    # Last message preview
    last_message: Optional[str]
    last_message_at: Optional[datetime]
    unread_count: int = 0

    is_archived: bool = False
