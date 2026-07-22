from fastapi import APIRouter
from app.api.routes.hr.salaries import router as salaries_router
from app.api.routes.hr.payroll import router as payroll_router
from app.api.routes.hr.attendance import router as attendance_router
from app.api.routes.hr.leave import router as leave_router
from app.api.routes.hr.reviews import router as reviews_router
from app.api.routes.hr.role_changes import router as role_changes_router

router = APIRouter(prefix="/hr", tags=["HR"])

router.include_router(salaries_router)
router.include_router(payroll_router)
router.include_router(attendance_router)
router.include_router(leave_router)
router.include_router(reviews_router)
router.include_router(role_changes_router)
