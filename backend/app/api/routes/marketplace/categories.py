"""
Marketplace categories endpoints.
Public access - no authentication required.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from typing import List
from app.database import get_db
from app.schemas.marketplace.category import CategoryResponse, CategoryTreeResponse
from app.services.marketplace.category_service import CategoryService
from app.core.exceptions import NotFoundError

router = APIRouter(prefix="/categories", tags=["marketplace-categories"])


@router.get("/", response_model=List[CategoryTreeResponse])
async def list_categories(
    db: Session = Depends(get_db),
):
    """
    Get all categories as a tree structure.
    Public endpoint - no authentication required.
    """
    service = CategoryService(db)
    return service.get_tree()


@router.get("/flat", response_model=List[CategoryResponse])
async def list_categories_flat(
    db: Session = Depends(get_db),
):
    """
    Get all categories as a flat list.
    Public endpoint - no authentication required.
    """
    service = CategoryService(db)
    return service.get_all()


@router.get("/{slug}", response_model=CategoryResponse)
async def get_category(
    slug: str,
    db: Session = Depends(get_db),
):
    """
    Get a category by slug.
    Public endpoint - no authentication required.
    """
    service = CategoryService(db)
    try:
        return service.get_by_slug(slug)
    except NotFoundError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=e.message)
