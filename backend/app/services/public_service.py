"""Service for public-facing garage profiles."""

from sqlmodel import Session, select, func
from typing import Optional, List
from datetime import datetime

from app.models.chain import Chain
from app.models.branch import Branch
from app.models.service import Service, ServiceStage
from app.models.job import Job
from app.schemas.public import (
    GarageListItem,
    GarageProfile,
    BranchPublic,
    ServicePublic,
    GarageListResponse,
)


class PublicService:
    """Service for fetching public garage information."""

    def __init__(self, db: Session):
        self.db = db

    def list_garages(
        self,
        city: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> GarageListResponse:
        """List all public garages with optional filtering."""

        # Base query - only public garages
        query = select(Chain).where(Chain.is_public == True)

        # Filter by city
        if city:
            query = query.where(Chain.city == city)

        # Search by name
        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                (Chain.display_name.ilike(search_pattern))
                | (Chain.name.ilike(search_pattern))
                | (Chain.tagline.ilike(search_pattern))
            )

        # Get total count
        count_query = select(func.count()).select_from(query.subquery())
        total = self.db.exec(count_query).one()

        # Order by: featured first, then by name
        query = query.order_by(Chain.is_featured.desc(), Chain.display_name)

        # Pagination
        query = query.offset(offset).limit(limit)

        chains = self.db.exec(query).all()

        # Build response items with branch counts
        items = []
        for chain in chains:
            branch_count = self.db.exec(
                select(func.count())
                .select_from(Branch)
                .where(Branch.chain_id == chain.id, Branch.is_active == True)
            ).one()

            logo_url = None
            if chain.branding and isinstance(chain.branding, dict):
                logo_url = chain.branding.get("logo_url")

            items.append(
                GarageListItem(
                    id=chain.id,
                    slug=chain.name,
                    display_name=chain.display_name,
                    tagline=chain.tagline,
                    logo_url=logo_url,
                    cover_image_url=chain.cover_image_url,
                    city=chain.city,
                    specialties=chain.specialties,
                    branch_count=branch_count,
                    is_featured=chain.is_featured,
                    year_established=chain.year_established,
                )
            )

        return GarageListResponse(
            items=items,
            total=total,
            limit=limit,
            offset=offset,
        )

    def get_garage_by_slug(self, slug: str) -> Optional[GarageProfile]:
        """Get full garage profile by slug (name)."""

        chain = self.db.exec(
            select(Chain).where(Chain.name == slug, Chain.is_public == True)
        ).first()

        if not chain:
            return None

        return self._build_garage_profile(chain)

    def get_garage_by_id(self, garage_id: int) -> Optional[GarageProfile]:
        """Get full garage profile by ID."""

        chain = self.db.exec(
            select(Chain).where(Chain.id == garage_id, Chain.is_public == True)
        ).first()

        if not chain:
            return None

        return self._build_garage_profile(chain)

    def _build_garage_profile(self, chain: Chain) -> GarageProfile:
        """Build full garage profile from chain."""

        # Get active branches
        branches = self.db.exec(
            select(Branch).where(
                Branch.chain_id == chain.id, Branch.is_active == True
            )
        ).all()

        # Get services
        services = self.db.exec(
            select(Service).where(
                Service.chain_id == chain.id, Service.is_active == True
            )
        ).all()

        # Get service stages
        service_list = []
        for service in services:
            stages = self.db.exec(
                select(ServiceStage)
                .where(ServiceStage.service_id == service.id)
                .order_by(ServiceStage.order)
            ).all()

            service_list.append(
                ServicePublic(
                    id=service.id,
                    name=service.name,
                    description=service.description,
                    stages=[s.name for s in stages],
                )
            )

        # Count completed jobs
        completed_jobs = self.db.exec(
            select(func.count())
            .select_from(Job)
            .join(Branch, Job.branch_id == Branch.id)
            .where(Branch.chain_id == chain.id, Job.status == "paid")
        ).one()

        # Extract branding
        logo_url = None
        primary_color = None
        accent_color = None
        if chain.branding and isinstance(chain.branding, dict):
            logo_url = chain.branding.get("logo_url")
            primary_color = chain.branding.get("primary_color")
            accent_color = chain.branding.get("accent_color")

        # Calculate years in business
        years_in_business = None
        if chain.year_established:
            years_in_business = datetime.now().year - chain.year_established

        return GarageProfile(
            id=chain.id,
            slug=chain.name,
            display_name=chain.display_name,
            tagline=chain.tagline,
            logo_url=logo_url,
            cover_image_url=chain.cover_image_url,
            primary_color=primary_color,
            accent_color=accent_color,
            description=chain.description,
            year_established=chain.year_established,
            specialties=chain.specialties,
            phone=chain.phone,
            whatsapp=chain.whatsapp,
            email=chain.email,
            address=chain.address,
            city=chain.city,
            website=chain.website,
            social_links=chain.social_links,
            gallery_images=chain.gallery_images,
            operating_hours=chain.operating_hours,
            branch_count=len(branches),
            total_jobs_completed=completed_jobs,
            years_in_business=years_in_business,
            branches=[
                BranchPublic(
                    id=b.id,
                    name=b.name,
                    address=b.address,
                    city=b.city,
                    geo_lat=b.geo_lat,
                    geo_lng=b.geo_lng,
                    phone=b.phone,
                    whatsapp=b.whatsapp,
                    operating_hours=b.operating_hours,
                    image_url=b.image_url,
                    bays=b.bays,
                )
                for b in branches
            ],
            services=service_list,
            is_featured=chain.is_featured,
            created_at=chain.created_at,
        )

    def get_cities(self) -> List[str]:
        """Get list of cities with public garages."""
        result = self.db.exec(
            select(Chain.city)
            .where(Chain.is_public == True, Chain.city.isnot(None))
            .distinct()
            .order_by(Chain.city)
        ).all()
        return [city for city in result if city]
