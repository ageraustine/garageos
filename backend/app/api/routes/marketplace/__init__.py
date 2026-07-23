"""Marketplace API routes."""

from fastapi import APIRouter
from .categories import router as categories_router
from .listings import router as listings_router
from .sellers import router as sellers_router
from .conversations import router as conversations_router

router = APIRouter(prefix="/marketplace", tags=["marketplace"])

router.include_router(categories_router)
router.include_router(listings_router)
router.include_router(sellers_router)
router.include_router(conversations_router)
