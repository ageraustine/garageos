from fastapi import APIRouter
from app.api.routes.analytics import analytics, trust_score

router = APIRouter()
router.include_router(analytics.router)
router.include_router(trust_score.router)
