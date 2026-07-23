"""Public API routes for garage profiles - no authentication required."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session
from typing import Optional, List

from app.database import get_db
from app.services.public_service import PublicService
from app.schemas.public import GarageProfile, GarageListResponse

router = APIRouter(prefix="/garages", tags=["public-garages"])


@router.get("", response_model=GarageListResponse)
async def list_garages(
    city: Optional[str] = Query(None, description="Filter by city"),
    search: Optional[str] = Query(None, description="Search by name"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    """
    List all public garages.

    Public endpoint - no authentication required.
    """
    service = PublicService(db)
    return service.list_garages(city=city, search=search, limit=limit, offset=offset)


@router.get("/cities", response_model=List[str])
async def list_cities(db: Session = Depends(get_db)):
    """
    Get list of cities with public garages.

    Useful for filter dropdowns.
    """
    service = PublicService(db)
    return service.get_cities()


@router.get("/{slug}", response_model=GarageProfile)
async def get_garage_profile(
    slug: str,
    db: Session = Depends(get_db),
):
    """
    Get full garage profile by slug.

    The slug is the unique garage identifier (chain.name).
    Example: /garages/autofix-kenya

    Public endpoint - no authentication required.
    """
    service = PublicService(db)
    profile = service.get_garage_by_slug(slug)

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Garage not found or not public",
        )

    return profile
