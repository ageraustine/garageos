"""Marketplace conversation service."""

from sqlmodel import Session, select, func
from typing import Optional, List
from datetime import datetime
from app.models.marketplace.conversation import (
    MarketplaceConversation,
    MarketplaceMessage,
)
from app.models.marketplace.listing import MarketplaceListing, MarketplaceListingImage
from app.models.marketplace.seller import MarketplaceSeller
from app.models.employee import Employee
from app.schemas.marketplace.conversation import (
    ConversationCreate,
    ConversationResponse,
    ConversationListItem,
    MessageCreate,
    MessageResponse,
    ConversationListingInfo,
    ConversationSellerInfo,
    ConversationBuyerInfo,
)
from app.core.exceptions import NotFoundError, ForbiddenError


class ConversationService:
    """Marketplace conversation operations."""

    def __init__(self, db: Session):
        self.db = db

    def start_conversation(
        self, data: ConversationCreate, buyer_id: Optional[int] = None
    ) -> MarketplaceConversation:
        """Start a new conversation about a listing."""
        listing = self.db.get(MarketplaceListing, data.listing_id)
        if not listing:
            raise NotFoundError(f"Listing {data.listing_id} not found")

        # Check if conversation already exists between buyer and seller for this listing
        query = select(MarketplaceConversation).where(
            MarketplaceConversation.listing_id == data.listing_id,
            MarketplaceConversation.seller_id == listing.seller_id,
        )
        if buyer_id:
            query = query.where(MarketplaceConversation.buyer_id == buyer_id)
        elif data.buyer_phone:
            query = query.where(MarketplaceConversation.buyer_phone == data.buyer_phone)

        existing = self.db.exec(query).first()
        if existing:
            # Add message to existing conversation
            self._add_message(existing.id, "buyer", data.message)
            self.db.refresh(existing)
            return existing

        # Create new conversation
        conversation = MarketplaceConversation(
            listing_id=data.listing_id,
            buyer_id=buyer_id,
            buyer_phone=data.buyer_phone,
            buyer_name=data.buyer_name,
            seller_id=listing.seller_id,
            last_message_at=datetime.utcnow(),
        )
        self.db.add(conversation)
        self.db.flush()

        # Add first message
        self._add_message(conversation.id, "buyer", data.message)
        self.db.commit()
        self.db.refresh(conversation)
        return conversation

    def get_by_id(self, id: int) -> MarketplaceConversation:
        """Get conversation by ID."""
        conversation = self.db.get(MarketplaceConversation, id)
        if not conversation:
            raise NotFoundError(f"Conversation {id} not found")
        return conversation

    def send_message(
        self,
        conversation_id: int,
        data: MessageCreate,
        sender_type: str,
    ) -> MarketplaceMessage:
        """Send a message in a conversation."""
        conversation = self.get_by_id(conversation_id)
        message = self._add_message(conversation_id, sender_type, data.content)
        conversation.last_message_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(message)
        return message

    def _add_message(
        self, conversation_id: int, sender_type: str, content: str
    ) -> MarketplaceMessage:
        """Add a message to a conversation."""
        message = MarketplaceMessage(
            conversation_id=conversation_id,
            sender_type=sender_type,
            content=content,
        )
        self.db.add(message)
        return message

    def mark_as_read(self, conversation_id: int, reader_type: str) -> None:
        """Mark all messages from the other party as read."""
        other_type = "seller" if reader_type == "buyer" else "buyer"
        messages = self.db.exec(
            select(MarketplaceMessage).where(
                MarketplaceMessage.conversation_id == conversation_id,
                MarketplaceMessage.sender_type == other_type,
                MarketplaceMessage.is_read == False,
            )
        ).all()
        for msg in messages:
            msg.is_read = True
        self.db.commit()

    def get_conversations_for_buyer(
        self,
        buyer_id: Optional[int] = None,
        buyer_phone: Optional[str] = None,
        include_archived: bool = False,
    ) -> List[ConversationListItem]:
        """Get all conversations for a buyer."""
        query = select(MarketplaceConversation)
        if buyer_id:
            query = query.where(MarketplaceConversation.buyer_id == buyer_id)
        elif buyer_phone:
            query = query.where(MarketplaceConversation.buyer_phone == buyer_phone)
        else:
            return []

        if not include_archived:
            query = query.where(MarketplaceConversation.is_archived_by_buyer == False)

        query = query.order_by(MarketplaceConversation.last_message_at.desc())
        conversations = self.db.exec(query).all()

        return [self._to_list_item(conv, "buyer") for conv in conversations]

    def get_conversations_for_seller(
        self, seller_id: int, include_archived: bool = False
    ) -> List[ConversationListItem]:
        """Get all conversations for a seller."""
        query = select(MarketplaceConversation).where(
            MarketplaceConversation.seller_id == seller_id
        )
        if not include_archived:
            query = query.where(MarketplaceConversation.is_archived_by_seller == False)

        query = query.order_by(MarketplaceConversation.last_message_at.desc())
        conversations = self.db.exec(query).all()

        return [self._to_list_item(conv, "seller") for conv in conversations]

    def get_response(self, conversation: MarketplaceConversation) -> ConversationResponse:
        """Convert conversation to full response with messages."""
        listing = self.db.get(MarketplaceListing, conversation.listing_id)
        seller = self.db.get(MarketplaceSeller, conversation.seller_id)

        # Get primary image
        primary_image = self.db.exec(
            select(MarketplaceListingImage)
            .where(MarketplaceListingImage.listing_id == listing.id)
            .order_by(MarketplaceListingImage.is_primary.desc())
            .limit(1)
        ).first()

        # Get messages
        messages = self.db.exec(
            select(MarketplaceMessage)
            .where(MarketplaceMessage.conversation_id == conversation.id)
            .order_by(MarketplaceMessage.created_at.asc())
        ).all()

        # Get buyer name
        buyer_name = conversation.buyer_name
        if conversation.buyer_id:
            employee = self.db.get(Employee, conversation.buyer_id)
            if employee:
                buyer_name = employee.name

        # Count unread
        unread_count = self.db.exec(
            select(func.count(MarketplaceMessage.id)).where(
                MarketplaceMessage.conversation_id == conversation.id,
                MarketplaceMessage.is_read == False,
            )
        ).one()

        return ConversationResponse(
            id=conversation.id,
            listing=ConversationListingInfo(
                id=listing.id,
                title=listing.title,
                price=float(listing.price),
                primary_image_url=primary_image.url if primary_image else None,
            ),
            seller=ConversationSellerInfo(
                id=seller.id,
                name=seller.name,
                logo_url=seller.logo_url,
            ),
            buyer=ConversationBuyerInfo(
                id=conversation.buyer_id,
                name=buyer_name,
                phone=conversation.buyer_phone,
            ),
            messages=[
                MessageResponse(
                    id=msg.id,
                    sender_type=msg.sender_type,
                    content=msg.content,
                    is_read=msg.is_read,
                    created_at=msg.created_at,
                )
                for msg in messages
            ],
            last_message_at=conversation.last_message_at,
            unread_count=unread_count or 0,
            created_at=conversation.created_at,
        )

    def _to_list_item(
        self, conversation: MarketplaceConversation, viewer_type: str
    ) -> ConversationListItem:
        """Convert conversation to list item."""
        listing = self.db.get(MarketplaceListing, conversation.listing_id)
        seller = self.db.get(MarketplaceSeller, conversation.seller_id)

        # Get primary image
        primary_image = self.db.exec(
            select(MarketplaceListingImage)
            .where(MarketplaceListingImage.listing_id == listing.id)
            .order_by(MarketplaceListingImage.is_primary.desc())
            .limit(1)
        ).first()

        # Get last message
        last_message = self.db.exec(
            select(MarketplaceMessage)
            .where(MarketplaceMessage.conversation_id == conversation.id)
            .order_by(MarketplaceMessage.created_at.desc())
            .limit(1)
        ).first()

        # Count unread (messages from other party)
        other_type = "seller" if viewer_type == "buyer" else "buyer"
        unread_count = self.db.exec(
            select(func.count(MarketplaceMessage.id)).where(
                MarketplaceMessage.conversation_id == conversation.id,
                MarketplaceMessage.sender_type == other_type,
                MarketplaceMessage.is_read == False,
            )
        ).one()

        # Determine other party info
        if viewer_type == "buyer":
            other_party_name = seller.name
            other_party_logo_url = seller.logo_url
            is_archived = conversation.is_archived_by_buyer
        else:
            # Seller is viewing - show buyer info
            buyer_name = conversation.buyer_name
            if conversation.buyer_id:
                employee = self.db.get(Employee, conversation.buyer_id)
                if employee:
                    buyer_name = employee.name
            other_party_name = buyer_name or conversation.buyer_phone or "Unknown"
            other_party_logo_url = None
            is_archived = conversation.is_archived_by_seller

        return ConversationListItem(
            id=conversation.id,
            listing_id=listing.id,
            listing_title=listing.title,
            listing_image_url=primary_image.url if primary_image else None,
            other_party_name=other_party_name,
            other_party_logo_url=other_party_logo_url,
            last_message=last_message.content[:100] if last_message else None,
            last_message_at=conversation.last_message_at,
            unread_count=unread_count or 0,
            is_archived=is_archived,
        )

    def archive(self, conversation_id: int, viewer_type: str) -> None:
        """Archive a conversation for a viewer."""
        conversation = self.get_by_id(conversation_id)
        if viewer_type == "buyer":
            conversation.is_archived_by_buyer = True
        else:
            conversation.is_archived_by_seller = True
        self.db.commit()
