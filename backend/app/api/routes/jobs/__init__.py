from fastapi import APIRouter
from app.api.routes.jobs import jobs, estimates, media

router = APIRouter()
router.include_router(jobs.router)
router.include_router(estimates.router)
router.include_router(media.router)
