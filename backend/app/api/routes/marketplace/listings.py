"""
Marketplace listings endpoints.
Public read, authenticated write.
"""

import time
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session
from typing import Optional, List
from decimal import Decimal
from app.database import get_db
from app.api.deps import get_current_user, get_storage_service
from app.models.employee import Employee
from app.schemas.marketplace.listing import (
    ListingCreate,
    ListingUpdate,
    ListingResponse,
    ListingListItem,
    ListingImageUploadRequest,
    ListingImageConfirm,
    ListingSearchParams,
)
from app.services.marketplace.listing_service import ListingService
from app.services.marketplace.seller_service import SellerService
from app.services.storage_service import StorageService
from app.core.exceptions import NotFoundError, ForbiddenError

router = APIRouter(prefix="/listings", tags=["marketplace-listings"])


def get_seller_for_user(seller_service: SellerService, current_user) -> "MarketplaceSeller":
    """Helper to get seller profile for current user (chain or external)."""
    from app.models.marketplace.seller import MarketplaceSeller

    if getattr(current_user, 'is_external_seller', False):
        seller = seller_service.get_for_external_seller(current_user.phone)
    else:
        seller = seller_service.get_by_chain_id(current_user.chain_id)

    return seller


@router.get("/", response_model=List[ListingListItem])
async def search_listings(
    search: Optional[str] = Query(None, description="Search text"),
    category_id: Optional[int] = Query(None, description="Category ID"),
    seller_id: Optional[int] = Query(None, description="Seller ID"),
    condition: Optional[str] = Query(None, regex="^(new|used|refurbished)$"),
    min_price: Optional[Decimal] = Query(None, ge=0),
    max_price: Optional[Decimal] = Query(None, ge=0),
    vehicle_make: Optional[str] = Query(None),
    vehicle_model: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    sort: str = Query("newest", regex="^(newest|price_asc|price_desc)$"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    storage: StorageService = Depends(get_storage_service),
):
    """
    Search and browse listings.
    Public endpoint - no authentication required.
    """
    service = ListingService(db, storage)
    params = ListingSearchParams(
        search=search,
        category_id=category_id,
        seller_id=seller_id,
        condition=condition,
        min_price=min_price,
        max_price=max_price,
        vehicle_make=vehicle_make,
        vehicle_model=vehicle_model,
        city=city,
        sort=sort,
        limit=limit,
        offset=offset,
    )
    return service.search(params)


@router.get("/{id}", response_model=ListingResponse)
async def get_listing(
    id: int,
    db: Session = Depends(get_db),
    storage: StorageService = Depends(get_storage_service),
):
    """
    Get listing details.
    Public endpoint - increments view count.
    """
    service = ListingService(db, storage)
    try:
        listing = service.get_by_id(id)
        service.increment_views(id)
        return service.get_response(listing)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)


@router.post("/", response_model=ListingResponse, status_code=status.HTTP_201_CREATED)
async def create_listing(
    data: ListingCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
    storage: StorageService = Depends(get_storage_service),
):
    """
    Create a new listing.
    Auto-creates seller profile for chain if it doesn't exist.
    External sellers use their existing seller profile.
    """
    listing_service = ListingService(db, storage)
    seller_service = SellerService(db)

    try:
        # Handle external sellers vs chain employees
        if getattr(current_user, 'is_external_seller', False):
            # External seller - lookup by phone
            seller = seller_service.get_for_external_seller(current_user.phone)
            if not seller:
                raise HTTPException(
                    status.HTTP_400_BAD_REQUEST,
                    detail="Seller profile not found. Please contact support.",
                )
        else:
            # Chain employee - get or auto-create seller profile
            seller = seller_service.get_or_create_for_chain(current_user.chain_id)

        listing = listing_service.create(data, seller_id=seller.id)
        return listing_service.get_response(listing)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)


@router.patch("/{id}", response_model=ListingResponse)
async def update_listing(
    id: int,
    data: ListingUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
    storage: StorageService = Depends(get_storage_service),
):
    """
    Update a listing.
    Only the listing owner can update.
    """
    listing_service = ListingService(db, storage)
    seller_service = SellerService(db)

    # Get seller profile for user (chain or external)
    seller = get_seller_for_user(seller_service, current_user)
    if not seller:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Seller profile not found")

    try:
        listing = listing_service.update(id, data, seller_id=seller.id)
        return listing_service.get_response(listing)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)
    except ForbiddenError as e:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=e.message)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_listing(
    id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """
    Delete a listing (soft delete).
    Only the listing owner can delete.
    """
    listing_service = ListingService(db)
    seller_service = SellerService(db)

    seller = get_seller_for_user(seller_service, current_user)
    if not seller:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Seller profile not found")

    try:
        listing_service.delete(id, seller_id=seller.id)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)
    except ForbiddenError as e:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=e.message)


# Image upload endpoints
@router.post("/{id}/images/upload-url")
async def get_image_upload_url(
    id: int,
    data: ListingImageUploadRequest,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
    storage: StorageService = Depends(get_storage_service),
):
    """
    Get a presigned URL for uploading a listing image.
    """
    listing_service = ListingService(db)
    seller_service = SellerService(db)

    # Verify ownership
    seller = get_seller_for_user(seller_service, current_user)
    if not seller:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Seller profile not found")

    try:
        listing = listing_service.get_by_id(id)
        if listing.seller_id != seller.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not your listing")
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)

    # Generate upload URL
    ext = data.content_type.split("/")[1]
    object_key = f"marketplace/listings/{id}/{current_user.id}_{int(time.time())}.{ext}"
    upload_url = storage.generate_generic_upload_url(object_key, data.content_type)

    return {"upload_url": upload_url, "object_key": object_key}


@router.post("/{id}/images", status_code=status.HTTP_201_CREATED)
async def confirm_image_upload(
    id: int,
    data: ListingImageConfirm,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
    storage: StorageService = Depends(get_storage_service),
):
    """
    Confirm image upload and add to listing.
    """
    listing_service = ListingService(db)
    seller_service = SellerService(db)

    seller = get_seller_for_user(seller_service, current_user)
    if not seller:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Seller profile not found")

    try:
        listing = listing_service.get_by_id(id)
        if listing.seller_id != seller.id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not your listing")

        # Get public URL
        url = storage.get_object_url(data.object_key)

        # Add image
        image = listing_service.add_image(id, url, is_primary=data.is_primary)
        return {
            "id": image.id,
            "url": image.url,
            "is_primary": image.is_primary,
        }
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)


@router.delete("/{listing_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_image(
    listing_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """
    Delete a listing image.
    """
    listing_service = ListingService(db)
    seller_service = SellerService(db)

    seller = get_seller_for_user(seller_service, current_user)
    if not seller:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Seller profile not found")

    try:
        listing_service.delete_image(image_id, seller_id=seller.id)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)
    except ForbiddenError as e:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail=e.message)
