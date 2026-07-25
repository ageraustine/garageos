from fastapi import APIRouter
from app.api.routes.crm import customers, vehicles

router = APIRouter()
router.include_router(customers.router)
router.include_router(vehicles.router)
