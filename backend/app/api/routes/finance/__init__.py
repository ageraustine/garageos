from fastapi import APIRouter
from app.api.routes.finance import expenses

router = APIRouter()
router.include_router(expenses.router)
