"""Marketplace listing service."""

from sqlmodel import Session, select, func, or_
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from app.models.marketplace.listing import MarketplaceListing, MarketplaceListingImage
from app.models.marketplace.seller import MarketplaceSeller
from app.models.marketplace.category import MarketplaceCategory
from app.schemas.marketplace.listing import (
    ListingCreate,
    ListingUpdate,
    ListingResponse,
    ListingListItem,
    ListingImageResponse,
    ListingSellerInfo,
    ListingCategoryInfo,
    ListingSearchParams,
)
from app.core.exceptions import NotFoundError, ForbiddenError
from app.services.storage_service import StorageService


class ListingService:
    """Marketplace listing operations."""

    def __init__(self, db: Session, storage: Optional[StorageService] = None):
        self.db = db
        self.storage = storage

    def _get_viewable_url(self, url: str) -> str:
        """Convert stored URL to viewable presigned URL."""
        if not self.storage or not url:
            return url
        # URL format: http://endpoint/bucket/marketplace/listings/...
        # Extract object key from URL
        try:
            url_parts = url.split(f"/{self.storage.bucket}/")
            if len(url_parts) == 2:
                object_key = url_parts[1]
                return self.storage.generate_presigned_download_url(object_key)
        except Exception:
            pass
        return url

    def create(self, data: ListingCreate, seller_id: int) -> MarketplaceListing:
        """Create a new listing."""
        # Verify category exists
        category = self.db.get(MarketplaceCategory, data.category_id)
        if not category:
            raise NotFoundError(f"Category {data.category_id} not found")

        listing = MarketplaceListing(
            seller_id=seller_id,
            **data.model_dump()
        )
        self.db.add(listing)
        self.db.commit()
        self.db.refresh(listing)
        return listing

    def get_by_id(self, id: int) -> MarketplaceListing:
        """Get listing by ID."""
        listing = self.db.get(MarketplaceListing, id)
        if not listing:
            raise NotFoundError(f"Listing {id} not found")
        return listing

    def update(
        self, id: int, data: ListingUpdate, seller_id: int
    ) -> MarketplaceListing:
        """Update a listing. Only owner can update."""
        listing = self.get_by_id(id)
        if listing.seller_id != seller_id:
            raise ForbiddenError("You can only update your own listings")

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(listing, key, value)
        listing.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(listing)
        return listing

    def delete(self, id: int, seller_id: int) -> None:
        """Delete a listing (soft delete). Only owner can delete."""
        listing = self.get_by_id(id)
        if listing.seller_id != seller_id:
            raise ForbiddenError("You can only delete your own listings")

        listing.is_active = False
        listing.updated_at = datetime.utcnow()
        self.db.commit()

    def increment_views(self, id: int) -> None:
        """Increment view count for a listing."""
        listing = self.get_by_id(id)
        listing.views_count += 1
        self.db.commit()

    def search(self, params: ListingSearchParams) -> List[ListingListItem]:
        """Search listings with filters."""
        query = select(MarketplaceListing).where(MarketplaceListing.is_active == True)

        # Text search in title and description
        if params.search:
            search_term = f"%{params.search}%"
            query = query.where(
                or_(
                    MarketplaceListing.title.ilike(search_term),
                    MarketplaceListing.description.ilike(search_term),
                    MarketplaceListing.part_number.ilike(search_term),
                    MarketplaceListing.brand.ilike(search_term),
                )
            )

        # Category filter (include child categories)
        if params.category_id:
            category_ids = self._get_category_ids_with_children(params.category_id)
            query = query.where(MarketplaceListing.category_id.in_(category_ids))

        # Seller filter
        if params.seller_id:
            query = query.where(MarketplaceListing.seller_id == params.seller_id)

        # Condition filter
        if params.condition:
            query = query.where(MarketplaceListing.condition == params.condition)

        # Price range
        if params.min_price is not None:
            query = query.where(MarketplaceListing.price >= params.min_price)
        if params.max_price is not None:
            query = query.where(MarketplaceListing.price <= params.max_price)

        # Vehicle compatibility
        if params.vehicle_make:
            query = query.where(MarketplaceListing.vehicle_make == params.vehicle_make)
        if params.vehicle_model:
            query = query.where(MarketplaceListing.vehicle_model == params.vehicle_model)

        # City filter (from seller)
        if params.city:
            seller_ids = self.db.exec(
                select(MarketplaceSeller.id).where(MarketplaceSeller.city == params.city)
            ).all()
            query = query.where(MarketplaceListing.seller_id.in_(seller_ids))

        # Sorting
        if params.sort == "newest":
            query = query.order_by(MarketplaceListing.created_at.desc())
        elif params.sort == "price_asc":
            query = query.order_by(MarketplaceListing.price.asc())
        elif params.sort == "price_desc":
            query = query.order_by(MarketplaceListing.price.desc())

        # Pagination
        query = query.offset(params.offset).limit(params.limit)

        listings = self.db.exec(query).all()
        return [self._to_list_item(listing) for listing in listings]

    def get_by_seller(
        self, seller_id: int, include_inactive: bool = False, limit: int = 50, offset: int = 0
    ) -> List[ListingListItem]:
        """Get all listings for a seller."""
        query = select(MarketplaceListing).where(MarketplaceListing.seller_id == seller_id)
        if not include_inactive:
            query = query.where(MarketplaceListing.is_active == True)
        query = query.order_by(MarketplaceListing.created_at.desc()).offset(offset).limit(limit)
        listings = self.db.exec(query).all()
        return [self._to_list_item(listing) for listing in listings]

    def get_response(self, listing: MarketplaceListing) -> ListingResponse:
        """Convert listing to full response."""
        seller = self.db.get(MarketplaceSeller, listing.seller_id)
        category = self.db.get(MarketplaceCategory, listing.category_id)

        images = self.db.exec(
            select(MarketplaceListingImage)
            .where(MarketplaceListingImage.listing_id == listing.id)
            .order_by(MarketplaceListingImage.sort_order)
        ).all()

        return ListingResponse(
            id=listing.id,
            seller_id=listing.seller_id,
            category_id=listing.category_id,
            title=listing.title,
            description=listing.description,
            price=listing.price,
            currency=listing.currency,
            condition=listing.condition,
            vehicle_make=listing.vehicle_make,
            vehicle_model=listing.vehicle_model,
            vehicle_year_from=listing.vehicle_year_from,
            vehicle_year_to=listing.vehicle_year_to,
            part_number=listing.part_number,
            brand=listing.brand,
            quantity_available=listing.quantity_available,
            is_negotiable=listing.is_negotiable,
            is_active=listing.is_active,
            views_count=listing.views_count,
            created_at=listing.created_at,
            updated_at=listing.updated_at,
            seller=ListingSellerInfo(
                id=seller.id,
                name=seller.name,
                logo_url=seller.logo_url,
                phone=seller.phone,
                whatsapp=seller.whatsapp,
                city=seller.city,
                is_verified=seller.is_verified,
            ),
            category=ListingCategoryInfo(
                id=category.id,
                name=category.name,
                slug=category.slug,
            ),
            images=[
                ListingImageResponse(
                    id=img.id,
                    url=self._get_viewable_url(img.url),
                    sort_order=img.sort_order,
                    is_primary=img.is_primary,
                )
                for img in images
            ],
        )

    def _to_list_item(self, listing: MarketplaceListing) -> ListingListItem:
        """Convert listing to list item."""
        seller = self.db.get(MarketplaceSeller, listing.seller_id)
        category = self.db.get(MarketplaceCategory, listing.category_id)

        # Get primary image
        primary_image = self.db.exec(
            select(MarketplaceListingImage)
            .where(MarketplaceListingImage.listing_id == listing.id)
            .order_by(MarketplaceListingImage.is_primary.desc(), MarketplaceListingImage.sort_order)
            .limit(1)
        ).first()

        return ListingListItem(
            id=listing.id,
            title=listing.title,
            price=listing.price,
            currency=listing.currency,
            condition=listing.condition,
            vehicle_make=listing.vehicle_make,
            vehicle_model=listing.vehicle_model,
            is_negotiable=listing.is_negotiable,
            is_active=listing.is_active,
            views_count=listing.views_count,
            created_at=listing.created_at,
            primary_image_url=self._get_viewable_url(primary_image.url) if primary_image else None,
            seller_id=seller.id,
            seller_name=seller.name,
            seller_city=seller.city,
            seller_is_verified=seller.is_verified,
            category_name=category.name if category else "Unknown",
        )

    def _get_category_ids_with_children(self, category_id: int) -> List[int]:
        """Get category ID and all child category IDs."""
        ids = [category_id]
        children = self.db.exec(
            select(MarketplaceCategory.id).where(
                MarketplaceCategory.parent_id == category_id
            )
        ).all()
        ids.extend(children)
        return ids

    # Image management
    def add_image(
        self, listing_id: int, url: str, is_primary: bool = False
    ) -> MarketplaceListingImage:
        """Add an image to a listing."""
        listing = self.get_by_id(listing_id)

        # Get max sort order
        max_order = self.db.exec(
            select(func.max(MarketplaceListingImage.sort_order)).where(
                MarketplaceListingImage.listing_id == listing_id
            )
        ).one()
        sort_order = (max_order or 0) + 1

        # If this is primary, unset other primaries
        if is_primary:
            self.db.exec(
                select(MarketplaceListingImage)
                .where(MarketplaceListingImage.listing_id == listing_id)
            )
            for img in self.db.exec(
                select(MarketplaceListingImage).where(
                    MarketplaceListingImage.listing_id == listing_id
                )
            ).all():
                img.is_primary = False

        image = MarketplaceListingImage(
            listing_id=listing_id,
            url=url,
            sort_order=sort_order,
            is_primary=is_primary,
        )
        self.db.add(image)
        self.db.commit()
        self.db.refresh(image)
        return image

    def delete_image(self, image_id: int, seller_id: int) -> None:
        """Delete an image. Only listing owner can delete."""
        image = self.db.get(MarketplaceListingImage, image_id)
        if not image:
            raise NotFoundError(f"Image {image_id} not found")

        listing = self.get_by_id(image.listing_id)
        if listing.seller_id != seller_id:
            raise ForbiddenError("You can only delete images from your own listings")

        self.db.delete(image)
        self.db.commit()
