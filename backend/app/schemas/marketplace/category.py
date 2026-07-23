"""Marketplace category schemas."""

from pydantic import BaseModel
from typing import Optional, List


class CategoryResponse(BaseModel):
    """Single category response."""

    id: int
    parent_id: Optional[int]
    name: str
    slug: str
    icon: Optional[str]
    sort_order: int
    listings_count: int = 0


class CategoryTreeResponse(BaseModel):
    """Category with children for tree view."""

    id: int
    name: str
    slug: str
    icon: Optional[str]
    sort_order: int
    listings_count: int = 0
    children: List["CategoryTreeResponse"] = []


# Enable forward reference for self-referential model
CategoryTreeResponse.model_rebuild()
