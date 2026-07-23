"""Marketplace category service."""

from sqlmodel import Session, select, func
from typing import List
from app.models.marketplace.category import MarketplaceCategory
from app.models.marketplace.listing import MarketplaceListing
from app.schemas.marketplace.category import CategoryResponse, CategoryTreeResponse


class CategoryService:
    """Marketplace category operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_all(self) -> List[CategoryResponse]:
        """Get all active categories as flat list."""
        categories = self.db.exec(
            select(MarketplaceCategory)
            .where(MarketplaceCategory.is_active == True)
            .order_by(MarketplaceCategory.sort_order)
        ).all()

        result = []
        for cat in categories:
            listings_count = self._get_listings_count(cat.id)
            result.append(
                CategoryResponse(
                    id=cat.id,
                    parent_id=cat.parent_id,
                    name=cat.name,
                    slug=cat.slug,
                    icon=cat.icon,
                    sort_order=cat.sort_order,
                    listings_count=listings_count,
                )
            )
        return result

    def get_tree(self) -> List[CategoryTreeResponse]:
        """Get categories as a tree structure."""
        # Get all top-level categories
        parents = self.db.exec(
            select(MarketplaceCategory)
            .where(
                MarketplaceCategory.is_active == True,
                MarketplaceCategory.parent_id == None,
            )
            .order_by(MarketplaceCategory.sort_order)
        ).all()

        result = []
        for parent in parents:
            result.append(self._build_tree_node(parent))
        return result

    def _build_tree_node(self, category: MarketplaceCategory) -> CategoryTreeResponse:
        """Build a tree node for a category."""
        # Get children
        children = self.db.exec(
            select(MarketplaceCategory)
            .where(
                MarketplaceCategory.is_active == True,
                MarketplaceCategory.parent_id == category.id,
            )
            .order_by(MarketplaceCategory.sort_order)
        ).all()

        # Get listings count (including children)
        listings_count = self._get_listings_count_with_children(category.id)

        return CategoryTreeResponse(
            id=category.id,
            name=category.name,
            slug=category.slug,
            icon=category.icon,
            sort_order=category.sort_order,
            listings_count=listings_count,
            children=[self._build_tree_node(child) for child in children],
        )

    def _get_listings_count(self, category_id: int) -> int:
        """Get count of active listings in a category."""
        result = self.db.exec(
            select(func.count(MarketplaceListing.id)).where(
                MarketplaceListing.category_id == category_id,
                MarketplaceListing.is_active == True,
            )
        ).one()
        return result or 0

    def _get_listings_count_with_children(self, category_id: int) -> int:
        """Get count of active listings in a category and its children."""
        # Get all child category IDs
        child_ids = self.db.exec(
            select(MarketplaceCategory.id).where(
                MarketplaceCategory.parent_id == category_id
            )
        ).all()

        all_ids = [category_id] + list(child_ids)

        result = self.db.exec(
            select(func.count(MarketplaceListing.id)).where(
                MarketplaceListing.category_id.in_(all_ids),
                MarketplaceListing.is_active == True,
            )
        ).one()
        return result or 0

    def get_by_slug(self, slug: str) -> CategoryResponse:
        """Get a category by slug."""
        category = self.db.exec(
            select(MarketplaceCategory).where(
                MarketplaceCategory.slug == slug,
                MarketplaceCategory.is_active == True,
            )
        ).first()

        if not category:
            from app.core.exceptions import NotFoundError
            raise NotFoundError(f"Category '{slug}' not found")

        listings_count = self._get_listings_count_with_children(category.id)
        return CategoryResponse(
            id=category.id,
            parent_id=category.parent_id,
            name=category.name,
            slug=category.slug,
            icon=category.icon,
            sort_order=category.sort_order,
            listings_count=listings_count,
        )
