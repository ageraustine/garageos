"""
Marketplace sellers endpoints.
Public read, authenticated write.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session
from typing import Optional, List
from app.database import get_db
from app.api.deps import get_current_user, get_storage_service
from app.models.employee import Employee
from app.schemas.marketplace.seller import (
    SellerCreate,
    SellerUpdate,
    SellerResponse,
    SellerListItem,
)
from app.schemas.marketplace.listing import ListingListItem
from app.services.marketplace.seller_service import SellerService
from app.services.marketplace.listing_service import ListingService
from app.services.storage_service import StorageService
from app.core.exceptions import NotFoundError, ConflictError

router = APIRouter(prefix="/sellers", tags=["marketplace-sellers"])


@router.get("/", response_model=List[SellerListItem])
async def list_sellers(
    city: Optional[str] = Query(None, description="Filter by city"),
    seller_type: Optional[str] = Query(None, regex="^(chain|external)$"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    List all active sellers.
    Public endpoint - no authentication required.
    """
    service = SellerService(db)
    return service.list(city=city, seller_type=seller_type, limit=limit, offset=offset)


@router.get("/me", response_model=Optional[SellerResponse])
async def get_my_seller_profile(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """
    Get the seller profile for the current user's chain.
    Returns null if no seller profile exists.
    """
    service = SellerService(db)
    seller = service.get_by_chain_id(current_user.chain_id)
    if seller:
        return service.get_response(seller)
    return None


@router.get("/{id}", response_model=SellerResponse)
async def get_seller(
    id: int,
    db: Session = Depends(get_db),
):
    """
    Get seller profile.
    Public endpoint - no authentication required.
    """
    service = SellerService(db)
    try:
        seller = service.get_by_id(id)
        return service.get_response(seller)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)


@router.get("/me/listings", response_model=List[ListingListItem])
async def get_my_listings(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
    storage: StorageService = Depends(get_storage_service),
):
    """
    Get all listings for the current seller, including inactive ones.
    Authenticated endpoint - shows hidden listings to owner.
    """
    seller_service = SellerService(db)
    listing_service = ListingService(db, storage)

    # Get seller for current user (chain or external)
    if getattr(current_user, 'is_external_seller', False):
        seller = seller_service.get_for_external_seller(current_user.phone)
    else:
        seller = seller_service.get_by_chain_id(current_user.chain_id)

    if not seller:
        return []

    return listing_service.get_by_seller(seller.id, include_inactive=True, limit=limit, offset=offset)


@router.get("/{id}/listings", response_model=List[ListingListItem])
async def get_seller_listings(
    id: int,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    storage: StorageService = Depends(get_storage_service),
):
    """
    Get all listings for a seller.
    Public endpoint - only shows active listings.
    """
    seller_service = SellerService(db)
    listing_service = ListingService(db, storage)

    try:
        seller_service.get_by_id(id)  # Verify seller exists
        return listing_service.get_by_seller(id, include_inactive=False, limit=limit, offset=offset)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)


@router.post("/", response_model=SellerResponse, status_code=status.HTTP_201_CREATED)
async def create_seller(
    data: SellerCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """
    Create a seller profile for the current user's chain.
    Each chain can only have one seller profile.
    """
    service = SellerService(db)

    # Force chain_id to current user's chain
    seller_data = data.model_dump()
    seller_data["chain_id"] = current_user.chain_id
    seller_data["seller_type"] = "chain"

    try:
        seller = service.create(SellerCreate(**seller_data))
        return service.get_response(seller)
    except ConflictError as e:
        raise HTTPException(status.HTTP_409_CONFLICT, detail=e.message)


@router.patch("/me", response_model=SellerResponse)
async def update_my_seller_profile(
    data: SellerUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """
    Update the seller profile for the current user's chain.
    """
    service = SellerService(db)

    seller = service.get_by_chain_id(current_user.chain_id)
    if not seller:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail="Seller profile not found. Create one first.",
        )

    seller = service.update(seller.id, data)
    return service.get_response(seller)


# Logo upload
@router.post("/me/logo/upload-url")
async def get_logo_upload_url(
    content_type: str = Query(..., regex="^image/(jpeg|png|webp)$"),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
    storage: StorageService = Depends(get_storage_service),
):
    """
    Get a presigned URL for uploading a seller logo.
    """
    service = SellerService(db)

    seller = service.get_by_chain_id(current_user.chain_id)
    if not seller:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail="Seller profile not found. Create one first.",
        )

    ext = content_type.split("/")[1]
    object_key = f"marketplace/sellers/{seller.id}/logo.{ext}"
    upload_url = storage.generate_generic_upload_url(object_key, content_type)

    return {"upload_url": upload_url, "object_key": object_key}


@router.post("/me/logo", response_model=SellerResponse)
async def confirm_logo_upload(
    object_key: str,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
    storage: StorageService = Depends(get_storage_service),
):
    """
    Confirm logo upload and update seller profile.
    """
    service = SellerService(db)

    seller = service.get_by_chain_id(current_user.chain_id)
    if not seller:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail="Seller profile not found.",
        )

    # Get object URL (stored in DB, will be converted to presigned URL when displayed)
    logo_url = storage.get_object_url(object_key)

    # Update seller
    seller = service.update(seller.id, SellerUpdate(logo_url=logo_url))
    return service.get_response(seller)
