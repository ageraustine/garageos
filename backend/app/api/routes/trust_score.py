"""
Trust Score API endpoints.

Read-only endpoints for trust score computation. No write operations
exist by design - the score is always computed from job data.
"""

from fastapi import APIRouter, Depends
from sqlmodel import Session
from app.database import get_db
from app.api.deps import get_current_user
from app.models.employee import Employee
from app.schemas.trust_score import TrustScoreResponse, TrustSignalsResponse
from app.services.trust_score_service import TrustScoreService

router = APIRouter(prefix="/trust-score", tags=["trust-score"])


def _to_response(result) -> TrustScoreResponse:
    """Convert service result to API response."""
    return TrustScoreResponse(
        score=result.score,
        signals=TrustSignalsResponse(
            estimate_accuracy=round(result.signals.estimate_accuracy, 3),
            verification_rate=round(result.signals.verification_rate, 3),
            timeliness=round(result.signals.timeliness, 3),
            quality=round(result.signals.quality, 3),
        ),
        job_count=result.job_count,
        minimum_jobs=result.minimum_jobs,
        is_building=result.is_building,
    )


@router.get("/me", response_model=TrustScoreResponse)
async def get_my_trust_score(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """
    Get trust score for the current authenticated user.

    Shows individual performance based on jobs where the user
    was the advisor or assigned mechanic.
    """
    service = TrustScoreService(db)
    result = service.compute_for_employee(current_user.id)
    return _to_response(result)


@router.get("/employee/{employee_id}", response_model=TrustScoreResponse)
async def get_employee_trust_score(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """
    Get trust score for a specific employee.

    Managers and HQ can view any employee's score.
    Employees can only view their own score.
    """
    from app.models.employee import EmployeeRole
    from fastapi import HTTPException, status

    # Check permissions
    if current_user.id != employee_id:
        if current_user.role not in [EmployeeRole.MANAGER, EmployeeRole.HQ]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only view your own trust score",
            )

    service = TrustScoreService(db)
    result = service.compute_for_employee(employee_id)
    return _to_response(result)


@router.get("/branch/{branch_id}", response_model=TrustScoreResponse)
async def get_branch_trust_score(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """
    Get trust score for a branch.

    All employees can view branch scores.
    """
    service = TrustScoreService(db)
    result = service.compute_for_branch(branch_id)
    return _to_response(result)


@router.get("/chain", response_model=TrustScoreResponse)
async def get_chain_trust_score(
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    """
    Get trust score for the entire chain.

    This is the brand-level trust score shown on the Brand Dashboard.
    """
    service = TrustScoreService(db)
    result = service.compute_for_chain(current_user.chain_id)
    return _to_response(result)
