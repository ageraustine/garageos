from fastapi import APIRouter
from app.api.routes.core import auth, employees, branches

router = APIRouter()
router.include_router(auth.router)
router.include_router(employees.router)
router.include_router(branches.router)
