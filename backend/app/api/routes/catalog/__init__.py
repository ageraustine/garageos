from fastapi import APIRouter
from app.api.routes.catalog import services, quotation

router = APIRouter()
router.include_router(services.router)
router.include_router(quotation.router)
