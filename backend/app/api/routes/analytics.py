"""Analytics API routes for job and business metrics."""

from datetime import date, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlmodel import Session

from app.database import get_db
from app.api.deps import get_current_user
from app.schemas.auth import UserResponse
from app.schemas.analytics import (
    KPISummary, JobFunnel, RevenueTrend, ServiceAnalytics,
    BranchComparison, EmployeeAnalytics, TimeAnalytics,
    CustomerMetrics, EstimateAccuracy, AnalyticsDashboard
)
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


def get_default_date_range() -> tuple[date, date]:
    """Get default date range (last 30 days)."""
    end = date.today()
    start = end - timedelta(days=29)
    return start, end


@router.get("/dashboard", response_model=AnalyticsDashboard)
async def get_analytics_dashboard(
    start_date: date = Query(None, description="Start date (default: 30 days ago)"),
    end_date: date = Query(None, description="End date (default: today)"),
    branch_id: int = Query(None, description="Filter by branch (HQ/Manager only)"),
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Get complete analytics dashboard.
    HQ and managers can filter by branch. Other roles see their branch only.
    """
    # Set default dates
    if start_date is None or end_date is None:
        start_date, end_date = get_default_date_range()

    # Validate date range
    if start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be before end_date"
        )

    # Max 365 days
    if (end_date - start_date).days > 365:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Date range cannot exceed 365 days"
        )

    # Determine branch filter based on role
    effective_branch_id = _get_effective_branch_id(current_user, branch_id)

    service = AnalyticsService(db)
    return service.get_full_dashboard(
        chain_id=current_user.chain_id,
        start_date=start_date,
        end_date=end_date,
        branch_id=effective_branch_id,
    )


@router.get("/kpis", response_model=KPISummary)
async def get_kpis(
    start_date: date = Query(None),
    end_date: date = Query(None),
    branch_id: int = Query(None),
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Get high-level KPIs."""
    if start_date is None or end_date is None:
        start_date, end_date = get_default_date_range()

    effective_branch_id = _get_effective_branch_id(current_user, branch_id)

    service = AnalyticsService(db)
    return service.get_kpis(
        chain_id=current_user.chain_id,
        start_date=start_date,
        end_date=end_date,
        branch_id=effective_branch_id,
    )


@router.get("/funnel", response_model=JobFunnel)
async def get_job_funnel(
    start_date: date = Query(None),
    end_date: date = Query(None),
    branch_id: int = Query(None),
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Get job status funnel with conversion rates."""
    if start_date is None or end_date is None:
        start_date, end_date = get_default_date_range()

    effective_branch_id = _get_effective_branch_id(current_user, branch_id)

    service = AnalyticsService(db)
    return service.get_job_funnel(
        chain_id=current_user.chain_id,
        start_date=start_date,
        end_date=end_date,
        branch_id=effective_branch_id,
    )


@router.get("/revenue", response_model=RevenueTrend)
async def get_revenue_trend(
    start_date: date = Query(None),
    end_date: date = Query(None),
    branch_id: int = Query(None),
    period: str = Query("daily", regex="^(daily|weekly|monthly)$"),
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Get revenue trends over time."""
    if start_date is None or end_date is None:
        start_date, end_date = get_default_date_range()

    effective_branch_id = _get_effective_branch_id(current_user, branch_id)

    service = AnalyticsService(db)
    return service.get_revenue_trend(
        chain_id=current_user.chain_id,
        start_date=start_date,
        end_date=end_date,
        branch_id=effective_branch_id,
        period=period,
    )


@router.get("/services", response_model=ServiceAnalytics)
async def get_service_analytics(
    start_date: date = Query(None),
    end_date: date = Query(None),
    branch_id: int = Query(None),
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Get service performance breakdown."""
    if start_date is None or end_date is None:
        start_date, end_date = get_default_date_range()

    effective_branch_id = _get_effective_branch_id(current_user, branch_id)

    service = AnalyticsService(db)
    return service.get_service_analytics(
        chain_id=current_user.chain_id,
        start_date=start_date,
        end_date=end_date,
        branch_id=effective_branch_id,
    )


@router.get("/branches", response_model=BranchComparison)
async def get_branch_comparison(
    start_date: date = Query(None),
    end_date: date = Query(None),
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """
    Compare all branches (HQ only).
    Returns performance metrics for each branch.
    """
    if current_user.role != "hq":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ can view branch comparison"
        )

    if start_date is None or end_date is None:
        start_date, end_date = get_default_date_range()

    service = AnalyticsService(db)
    return service.get_branch_comparison(
        chain_id=current_user.chain_id,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/employees", response_model=EmployeeAnalytics)
async def get_employee_analytics(
    start_date: date = Query(None),
    end_date: date = Query(None),
    branch_id: int = Query(None),
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Get employee performance metrics (HQ/Manager only)."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ and managers can view employee analytics"
        )

    if start_date is None or end_date is None:
        start_date, end_date = get_default_date_range()

    effective_branch_id = _get_effective_branch_id(current_user, branch_id)

    service = AnalyticsService(db)
    return service.get_employee_analytics(
        chain_id=current_user.chain_id,
        start_date=start_date,
        end_date=end_date,
        branch_id=effective_branch_id,
    )


@router.get("/time", response_model=TimeAnalytics)
async def get_time_analytics(
    start_date: date = Query(None),
    end_date: date = Query(None),
    branch_id: int = Query(None),
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Get time-based analytics (busiest days, etc.)."""
    if start_date is None or end_date is None:
        start_date, end_date = get_default_date_range()

    effective_branch_id = _get_effective_branch_id(current_user, branch_id)

    service = AnalyticsService(db)
    return service.get_time_analytics(
        chain_id=current_user.chain_id,
        start_date=start_date,
        end_date=end_date,
        branch_id=effective_branch_id,
    )


@router.get("/customers", response_model=CustomerMetrics)
async def get_customer_metrics(
    start_date: date = Query(None),
    end_date: date = Query(None),
    branch_id: int = Query(None),
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Get customer analytics."""
    if start_date is None or end_date is None:
        start_date, end_date = get_default_date_range()

    effective_branch_id = _get_effective_branch_id(current_user, branch_id)

    service = AnalyticsService(db)
    return service.get_customer_metrics(
        chain_id=current_user.chain_id,
        start_date=start_date,
        end_date=end_date,
        branch_id=effective_branch_id,
    )


@router.get("/estimates", response_model=EstimateAccuracy)
async def get_estimate_accuracy(
    start_date: date = Query(None),
    end_date: date = Query(None),
    branch_id: int = Query(None),
    db: Session = Depends(get_db),
    current_user: UserResponse = Depends(get_current_user),
):
    """Get estimate vs actual payment accuracy."""
    if start_date is None or end_date is None:
        start_date, end_date = get_default_date_range()

    effective_branch_id = _get_effective_branch_id(current_user, branch_id)

    service = AnalyticsService(db)
    return service.get_estimate_accuracy(
        chain_id=current_user.chain_id,
        start_date=start_date,
        end_date=end_date,
        branch_id=effective_branch_id,
    )


def _get_effective_branch_id(current_user: UserResponse, requested_branch_id: int | None) -> int | None:
    """
    Determine the effective branch ID based on user role.
    HQ can view all branches (None) or specific branch.
    Managers can view their branch only.
    Others see only their branch.
    """
    if current_user.role == "hq":
        return requested_branch_id  # Can be None for all branches

    if current_user.role == "manager":
        # Managers can only view their own branch
        if requested_branch_id and requested_branch_id != current_user.branch_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view analytics for your own branch"
            )
        return current_user.branch_id

    # Advisors and mechanics see only their branch
    return current_user.branch_id
