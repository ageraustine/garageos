from fastapi import APIRouter
from app.api.routes.public import link, garages

router = APIRouter()
router.include_router(link.router)
router.include_router(garages.router)
