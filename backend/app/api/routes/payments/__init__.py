from fastapi import APIRouter
from app.api.routes.payments import payments, mpesa_callback

router = APIRouter()
router.include_router(payments.router)
router.include_router(mpesa_callback.router)
