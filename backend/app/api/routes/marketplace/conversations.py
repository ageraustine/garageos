"""
Marketplace conversations endpoints.
Authenticated access required.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session
from typing import Optional, List
from app.database import get_db
from app.api.deps import get_current_user
from app.models.employee import Employee
from app.schemas.marketplace.conversation import (
    ConversationCreate,
    ConversationResponse,
    ConversationListItem,
    MessageCreate,
    MessageResponse,
)
from app.services.marketplace.conversation_service import ConversationService
from app.services.marketplace.seller_service import SellerService
from app.core.exceptions import NotFoundError, ForbiddenError

router = APIRouter(prefix="/conversations", tags=["marketplace-conversations"])


@router.get("/", response_model=List[ConversationListItem])
async def list_conversations(
    role: str = Query("buyer", regex="^(buyer|seller)$", description="View as buyer or seller"),
    include_archived: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """
    List conversations for the current user.
    - As buyer: conversations where you inquired about listings
    - As seller: conversations from potential buyers on your listings
    """
    service = ConversationService(db)

    if role == "seller":
        # Get seller profile
        seller_service = SellerService(db)
        seller = seller_service.get_by_chain_id(current_user.chain_id)
        if not seller:
            return []
        return service.get_conversations_for_seller(seller.id, include_archived)
    else:
        # As buyer
        return service.get_conversations_for_buyer(
            buyer_id=current_user.id, include_archived=include_archived
        )


@router.post("/", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def start_conversation(
    data: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """
    Start a new conversation about a listing or add to existing one.
    """
    service = ConversationService(db)
    try:
        conversation = service.start_conversation(data, buyer_id=current_user.id)
        return service.get_response(conversation)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)


@router.get("/{id}", response_model=ConversationResponse)
async def get_conversation(
    id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """
    Get conversation with all messages.
    Only participants can view.
    """
    service = ConversationService(db)
    seller_service = SellerService(db)

    try:
        conversation = service.get_by_id(id)

        # Check if user is a participant
        is_buyer = conversation.buyer_id == current_user.id
        seller = seller_service.get_by_chain_id(current_user.chain_id)
        is_seller = seller and conversation.seller_id == seller.id

        if not is_buyer and not is_seller:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this conversation",
            )

        return service.get_response(conversation)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)


@router.post("/{id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    id: int,
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """
    Send a message in a conversation.
    """
    service = ConversationService(db)
    seller_service = SellerService(db)

    try:
        conversation = service.get_by_id(id)

        # Determine sender type
        seller = seller_service.get_by_chain_id(current_user.chain_id)
        is_seller = seller and conversation.seller_id == seller.id
        is_buyer = conversation.buyer_id == current_user.id

        if is_seller:
            sender_type = "seller"
        elif is_buyer:
            sender_type = "buyer"
        else:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this conversation",
            )

        message = service.send_message(id, data, sender_type)
        return MessageResponse(
            id=message.id,
            sender_type=message.sender_type,
            content=message.content,
            is_read=message.is_read,
            created_at=message.created_at,
        )
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)


@router.post("/{id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_as_read(
    id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """
    Mark all messages in conversation as read.
    """
    service = ConversationService(db)
    seller_service = SellerService(db)

    try:
        conversation = service.get_by_id(id)

        # Determine reader type
        seller = seller_service.get_by_chain_id(current_user.chain_id)
        is_seller = seller and conversation.seller_id == seller.id
        is_buyer = conversation.buyer_id == current_user.id

        if is_seller:
            reader_type = "seller"
        elif is_buyer:
            reader_type = "buyer"
        else:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this conversation",
            )

        service.mark_as_read(id, reader_type)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)


@router.post("/{id}/archive", status_code=status.HTTP_204_NO_CONTENT)
async def archive_conversation(
    id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """
    Archive a conversation.
    """
    service = ConversationService(db)
    seller_service = SellerService(db)

    try:
        conversation = service.get_by_id(id)

        # Determine viewer type
        seller = seller_service.get_by_chain_id(current_user.chain_id)
        is_seller = seller and conversation.seller_id == seller.id
        is_buyer = conversation.buyer_id == current_user.id

        if is_seller:
            viewer_type = "seller"
        elif is_buyer:
            viewer_type = "buyer"
        else:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this conversation",
            )

        service.archive(id, viewer_type)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)
