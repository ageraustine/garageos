"""Marketplace seller service."""

from sqlmodel import Session, select, func
from typing import Optional, List
from datetime import datetime
from app.models.marketplace.seller import MarketplaceSeller
from app.models.marketplace.listing import MarketplaceListing
from app.models.chain import Chain
from app.models.branch import Branch
from app.models.employee import Employee, EmployeeRole
from app.schemas.marketplace.seller import (
    SellerCreate,
    SellerUpdate,
    SellerResponse,
    SellerListItem,
)
from app.core.exceptions import NotFoundError, ConflictError


class SellerService:
    """Marketplace seller operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_or_create_for_chain(self, chain_id: int) -> MarketplaceSeller:
        """
        Get existing seller profile for chain, or auto-create one.
        Uses chain's display_name, HQ user's phone, and first branch's name as city.
        """
        # Check if seller already exists
        existing = self.get_by_chain_id(chain_id)
        if existing:
            return existing

        # Get chain info
        chain = self.db.get(Chain, chain_id)
        if not chain:
            raise NotFoundError(f"Chain {chain_id} not found")

        # Get HQ user's phone (or any employee's phone as fallback)
        hq_user = self.db.exec(
            select(Employee).where(
                Employee.chain_id == chain_id,
                Employee.role == EmployeeRole.HQ,
                Employee.is_active == True,
            )
        ).first()

        if not hq_user:
            # Fallback to any active employee
            hq_user = self.db.exec(
                select(Employee).where(
                    Employee.chain_id == chain_id,
                    Employee.is_active == True,
                )
            ).first()

        if not hq_user:
            raise NotFoundError(f"No active employees found for chain {chain_id}")

        # Get first branch for city
        first_branch = self.db.exec(
            select(Branch).where(Branch.chain_id == chain_id).order_by(Branch.id)
        ).first()

        # Get logo from chain branding if available
        logo_url = None
        if chain.branding and isinstance(chain.branding, dict):
            logo_url = chain.branding.get("logo_url")

        # Create seller profile
        seller = MarketplaceSeller(
            seller_type="chain",
            chain_id=chain_id,
            name=chain.display_name,
            phone=hq_user.phone,
            email=hq_user.email,
            logo_url=logo_url,
            city=first_branch.name if first_branch else None,
            is_verified=True,  # Chain sellers are auto-verified
        )
        self.db.add(seller)
        self.db.commit()
        self.db.refresh(seller)
        return seller

    def get_for_external_seller(self, phone: str) -> MarketplaceSeller | None:
        """Get seller profile for an external seller by phone number."""
        return self.db.exec(
            select(MarketplaceSeller).where(
                MarketplaceSeller.seller_type == "external",
                MarketplaceSeller.phone == phone,
            )
        ).first()

    def get_or_create_for_user(self, employee: Employee) -> MarketplaceSeller:
        """
        Get or create seller profile for any user (chain or external).
        """
        if employee.is_external_seller:
            # External seller - lookup by phone
            seller = self.get_for_external_seller(employee.phone)
            if not seller:
                raise NotFoundError(
                    "Seller profile not found. This shouldn't happen for external sellers."
                )
            return seller
        else:
            # Chain employee - use chain-based lookup
            return self.get_or_create_for_chain(employee.chain_id)

    def create(self, data: SellerCreate) -> MarketplaceSeller:
        """Create a new seller profile."""
        # If chain_id provided, check if seller already exists for this chain
        if data.chain_id:
            existing = self.db.exec(
                select(MarketplaceSeller).where(
                    MarketplaceSeller.chain_id == data.chain_id
                )
            ).first()
            if existing:
                raise ConflictError("Seller profile already exists for this chain")

        seller = MarketplaceSeller(**data.model_dump())
        self.db.add(seller)
        self.db.commit()
        self.db.refresh(seller)
        return seller

    def get_by_id(self, id: int) -> MarketplaceSeller:
        """Get seller by ID."""
        seller = self.db.get(MarketplaceSeller, id)
        if not seller:
            raise NotFoundError(f"Seller {id} not found")
        return seller

    def get_by_chain_id(self, chain_id: int) -> Optional[MarketplaceSeller]:
        """Get seller profile for a chain."""
        return self.db.exec(
            select(MarketplaceSeller).where(MarketplaceSeller.chain_id == chain_id)
        ).first()

    def update(self, id: int, data: SellerUpdate) -> MarketplaceSeller:
        """Update seller profile."""
        seller = self.get_by_id(id)
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(seller, key, value)
        seller.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(seller)
        return seller

    def list(
        self,
        city: Optional[str] = None,
        seller_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> List[SellerListItem]:
        """List active sellers."""
        query = select(MarketplaceSeller).where(MarketplaceSeller.is_active == True)

        if city:
            query = query.where(MarketplaceSeller.city == city)
        if seller_type:
            query = query.where(MarketplaceSeller.seller_type == seller_type)

        query = query.order_by(
            MarketplaceSeller.is_verified.desc(),
            MarketplaceSeller.created_at.desc()
        ).offset(offset).limit(limit)

        sellers = self.db.exec(query).all()

        result = []
        for seller in sellers:
            listings_count = self._get_listings_count(seller.id)
            result.append(
                SellerListItem(
                    id=seller.id,
                    seller_type=seller.seller_type,
                    name=seller.name,
                    logo_url=seller.logo_url,
                    city=seller.city,
                    is_verified=seller.is_verified,
                    listings_count=listings_count,
                )
            )

        return result

    def get_response(self, seller: MarketplaceSeller) -> SellerResponse:
        """Convert seller to response with listings count."""
        listings_count = self._get_listings_count(seller.id)
        return SellerResponse(
            id=seller.id,
            seller_type=seller.seller_type,
            chain_id=seller.chain_id,
            name=seller.name,
            description=seller.description,
            logo_url=seller.logo_url,
            phone=seller.phone,
            email=seller.email,
            whatsapp=seller.whatsapp,
            location=seller.location,
            city=seller.city,
            is_verified=seller.is_verified,
            is_active=seller.is_active,
            listings_count=listings_count,
            created_at=seller.created_at,
        )

    def _get_listings_count(self, seller_id: int) -> int:
        """Get count of active listings for a seller."""
        result = self.db.exec(
            select(func.count(MarketplaceListing.id)).where(
                MarketplaceListing.seller_id == seller_id,
                MarketplaceListing.is_active == True,
            )
        ).one()
        return result or 0
