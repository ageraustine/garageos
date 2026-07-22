from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from typing import Optional

from app.database import get_db
from app.api.deps import get_current_user
from app.services.hr.review_service import ReviewService
from app.models.hr.performance_review import ReviewPeriodType
from app.models.employee import Employee
from app.schemas.hr.review import (
    PerformanceReviewCreate,
    PerformanceReviewUpdate,
    PerformanceReviewResponse,
    EmployeeCommentRequest,
)

router = APIRouter(prefix="/reviews", tags=["HR - Performance Reviews"])


@router.get("/", response_model=list[PerformanceReviewResponse])
async def list_reviews(
    employee_id: Optional[int] = None,
    is_draft: Optional[bool] = None,
    period_type: Optional[ReviewPeriodType] = None,
    limit: int = 50,
    offset: int = 0,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List performance reviews. Manager+ only."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can list reviews"
        )

    service = ReviewService(db)
    reviews = service.list_reviews(
        chain_id=current_user.chain_id,
        employee_id=employee_id,
        is_draft=is_draft,
        period_type=period_type,
        limit=limit,
        offset=offset,
    )

    result = []
    for review in reviews:
        employee = db.query(Employee).filter(Employee.id == review.employee_id).first()
        reviewer = db.query(Employee).filter(Employee.id == review.reviewer_id).first()

        result.append(PerformanceReviewResponse(
            id=review.id,
            employee_id=review.employee_id,
            employee_name=employee.name if employee else None,
            chain_id=review.chain_id,
            period_type=review.period_type,
            period_start=review.period_start,
            period_end=review.period_end,
            rating_quality=review.rating_quality,
            rating_productivity=review.rating_productivity,
            rating_teamwork=review.rating_teamwork,
            rating_punctuality=review.rating_punctuality,
            rating_customer_service=review.rating_customer_service,
            overall_rating=review.overall_rating,
            strengths=review.strengths,
            areas_for_improvement=review.areas_for_improvement,
            goals_next_period=review.goals_next_period,
            reviewer_comments=review.reviewer_comments,
            employee_comments=review.employee_comments,
            trust_score_at_review=review.trust_score_at_review,
            jobs_completed=review.jobs_completed,
            is_draft=review.is_draft,
            reviewer_id=review.reviewer_id,
            reviewer_name=reviewer.name if reviewer else None,
            reviewed_at=review.reviewed_at,
            acknowledged_by_employee=review.acknowledged_by_employee,
            acknowledged_at=review.acknowledged_at,
            created_at=review.created_at,
            updated_at=review.updated_at,
        ))

    return result


@router.post("/", response_model=PerformanceReviewResponse)
async def create_review(
    data: PerformanceReviewCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new performance review. Manager+ only."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can create reviews"
        )

    try:
        ratings = {
            "quality": data.rating_quality,
            "productivity": data.rating_productivity,
            "teamwork": data.rating_teamwork,
            "punctuality": data.rating_punctuality,
            "customer_service": data.rating_customer_service,
        }

        feedback = {
            "strengths": data.strengths,
            "areas_for_improvement": data.areas_for_improvement,
            "goals_next_period": data.goals_next_period,
            "reviewer_comments": data.reviewer_comments,
        }

        service = ReviewService(db)
        review = service.create_review(
            employee_id=data.employee_id,
            chain_id=current_user.chain_id,
            reviewer_id=current_user.id,
            period_type=data.period_type,
            period_start=data.period_start,
            period_end=data.period_end,
            ratings=ratings,
            feedback=feedback,
        )

        return PerformanceReviewResponse(
            id=review.id,
            employee_id=review.employee_id,
            chain_id=review.chain_id,
            period_type=review.period_type,
            period_start=review.period_start,
            period_end=review.period_end,
            rating_quality=review.rating_quality,
            rating_productivity=review.rating_productivity,
            rating_teamwork=review.rating_teamwork,
            rating_punctuality=review.rating_punctuality,
            rating_customer_service=review.rating_customer_service,
            overall_rating=review.overall_rating,
            strengths=review.strengths,
            areas_for_improvement=review.areas_for_improvement,
            goals_next_period=review.goals_next_period,
            reviewer_comments=review.reviewer_comments,
            employee_comments=review.employee_comments,
            trust_score_at_review=review.trust_score_at_review,
            jobs_completed=review.jobs_completed,
            is_draft=review.is_draft,
            reviewer_id=review.reviewer_id,
            reviewed_at=review.reviewed_at,
            acknowledged_by_employee=review.acknowledged_by_employee,
            acknowledged_at=review.acknowledged_at,
            created_at=review.created_at,
            updated_at=review.updated_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{review_id}", response_model=PerformanceReviewResponse)
async def get_review(
    review_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a performance review. Reviewee, reviewer, or HQ only."""
    service = ReviewService(db)
    review = service.get_review(review_id, current_user.chain_id)

    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    # Check access
    is_employee = review.employee_id == current_user.id
    is_reviewer = review.reviewer_id == current_user.id
    is_hq = current_user.role == "hq"
    is_manager = current_user.role == "manager"

    if not (is_employee or is_reviewer or is_hq or is_manager):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this review"
        )

    employee = db.query(Employee).filter(Employee.id == review.employee_id).first()
    reviewer = db.query(Employee).filter(Employee.id == review.reviewer_id).first()

    return PerformanceReviewResponse(
        id=review.id,
        employee_id=review.employee_id,
        employee_name=employee.name if employee else None,
        chain_id=review.chain_id,
        period_type=review.period_type,
        period_start=review.period_start,
        period_end=review.period_end,
        rating_quality=review.rating_quality,
        rating_productivity=review.rating_productivity,
        rating_teamwork=review.rating_teamwork,
        rating_punctuality=review.rating_punctuality,
        rating_customer_service=review.rating_customer_service,
        overall_rating=review.overall_rating,
        strengths=review.strengths,
        areas_for_improvement=review.areas_for_improvement,
        goals_next_period=review.goals_next_period,
        reviewer_comments=review.reviewer_comments,
        employee_comments=review.employee_comments,
        trust_score_at_review=review.trust_score_at_review,
        jobs_completed=review.jobs_completed,
        is_draft=review.is_draft,
        reviewer_id=review.reviewer_id,
        reviewer_name=reviewer.name if reviewer else None,
        reviewed_at=review.reviewed_at,
        acknowledged_by_employee=review.acknowledged_by_employee,
        acknowledged_at=review.acknowledged_at,
        created_at=review.created_at,
        updated_at=review.updated_at,
    )


@router.patch("/{review_id}", response_model=PerformanceReviewResponse)
async def update_review(
    review_id: int,
    data: PerformanceReviewUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a draft review. Reviewer only."""
    try:
        ratings = {
            "quality": data.rating_quality,
            "productivity": data.rating_productivity,
            "teamwork": data.rating_teamwork,
            "punctuality": data.rating_punctuality,
            "customer_service": data.rating_customer_service,
        }
        # Remove None values
        ratings = {k: v for k, v in ratings.items() if v is not None}

        feedback = {
            "strengths": data.strengths,
            "areas_for_improvement": data.areas_for_improvement,
            "goals_next_period": data.goals_next_period,
            "reviewer_comments": data.reviewer_comments,
        }
        # Remove None values
        feedback = {k: v for k, v in feedback.items() if v is not None}

        service = ReviewService(db)
        review = service.update_review(
            review_id=review_id,
            chain_id=current_user.chain_id,
            reviewer_id=current_user.id,
            ratings=ratings if ratings else None,
            feedback=feedback if feedback else None,
        )

        return PerformanceReviewResponse(
            id=review.id,
            employee_id=review.employee_id,
            chain_id=review.chain_id,
            period_type=review.period_type,
            period_start=review.period_start,
            period_end=review.period_end,
            rating_quality=review.rating_quality,
            rating_productivity=review.rating_productivity,
            rating_teamwork=review.rating_teamwork,
            rating_punctuality=review.rating_punctuality,
            rating_customer_service=review.rating_customer_service,
            overall_rating=review.overall_rating,
            strengths=review.strengths,
            areas_for_improvement=review.areas_for_improvement,
            goals_next_period=review.goals_next_period,
            reviewer_comments=review.reviewer_comments,
            employee_comments=review.employee_comments,
            trust_score_at_review=review.trust_score_at_review,
            jobs_completed=review.jobs_completed,
            is_draft=review.is_draft,
            reviewer_id=review.reviewer_id,
            reviewed_at=review.reviewed_at,
            acknowledged_by_employee=review.acknowledged_by_employee,
            acknowledged_at=review.acknowledged_at,
            created_at=review.created_at,
            updated_at=review.updated_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{review_id}/submit", response_model=PerformanceReviewResponse)
async def submit_review(
    review_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit/finalize a review. Reviewer only."""
    try:
        service = ReviewService(db)
        review = service.submit_review(
            review_id=review_id,
            chain_id=current_user.chain_id,
            reviewer_id=current_user.id,
        )

        return PerformanceReviewResponse(
            id=review.id,
            employee_id=review.employee_id,
            chain_id=review.chain_id,
            period_type=review.period_type,
            period_start=review.period_start,
            period_end=review.period_end,
            rating_quality=review.rating_quality,
            rating_productivity=review.rating_productivity,
            rating_teamwork=review.rating_teamwork,
            rating_punctuality=review.rating_punctuality,
            rating_customer_service=review.rating_customer_service,
            overall_rating=review.overall_rating,
            strengths=review.strengths,
            areas_for_improvement=review.areas_for_improvement,
            goals_next_period=review.goals_next_period,
            reviewer_comments=review.reviewer_comments,
            employee_comments=review.employee_comments,
            trust_score_at_review=review.trust_score_at_review,
            jobs_completed=review.jobs_completed,
            is_draft=review.is_draft,
            reviewer_id=review.reviewer_id,
            reviewed_at=review.reviewed_at,
            acknowledged_by_employee=review.acknowledged_by_employee,
            acknowledged_at=review.acknowledged_at,
            created_at=review.created_at,
            updated_at=review.updated_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{review_id}/acknowledge", response_model=PerformanceReviewResponse)
async def acknowledge_review(
    review_id: int,
    data: Optional[EmployeeCommentRequest] = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Employee acknowledges their review."""
    try:
        service = ReviewService(db)
        review = service.acknowledge_review(
            review_id=review_id,
            employee_id=current_user.id,
            employee_comments=data.employee_comments if data else None,
        )

        return PerformanceReviewResponse(
            id=review.id,
            employee_id=review.employee_id,
            chain_id=review.chain_id,
            period_type=review.period_type,
            period_start=review.period_start,
            period_end=review.period_end,
            rating_quality=review.rating_quality,
            rating_productivity=review.rating_productivity,
            rating_teamwork=review.rating_teamwork,
            rating_punctuality=review.rating_punctuality,
            rating_customer_service=review.rating_customer_service,
            overall_rating=review.overall_rating,
            strengths=review.strengths,
            areas_for_improvement=review.areas_for_improvement,
            goals_next_period=review.goals_next_period,
            reviewer_comments=review.reviewer_comments,
            employee_comments=review.employee_comments,
            trust_score_at_review=review.trust_score_at_review,
            jobs_completed=review.jobs_completed,
            is_draft=review.is_draft,
            reviewer_id=review.reviewer_id,
            reviewed_at=review.reviewed_at,
            acknowledged_by_employee=review.acknowledged_by_employee,
            acknowledged_at=review.acknowledged_at,
            created_at=review.created_at,
            updated_at=review.updated_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/employees/{employee_id}/history", response_model=list[PerformanceReviewResponse])
async def get_employee_review_history(
    employee_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get review history for an employee. Manager+ or own history."""
    is_own = employee_id == current_user.id
    is_manager_or_hq = current_user.role in ["hq", "manager"]

    if not (is_own or is_manager_or_hq):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this employee's reviews"
        )

    service = ReviewService(db)
    reviews = service.get_employee_history(employee_id, current_user.chain_id)

    result = []
    for review in reviews:
        reviewer = db.query(Employee).filter(Employee.id == review.reviewer_id).first()
        result.append(PerformanceReviewResponse(
            id=review.id,
            employee_id=review.employee_id,
            chain_id=review.chain_id,
            period_type=review.period_type,
            period_start=review.period_start,
            period_end=review.period_end,
            rating_quality=review.rating_quality,
            rating_productivity=review.rating_productivity,
            rating_teamwork=review.rating_teamwork,
            rating_punctuality=review.rating_punctuality,
            rating_customer_service=review.rating_customer_service,
            overall_rating=review.overall_rating,
            strengths=review.strengths,
            areas_for_improvement=review.areas_for_improvement,
            goals_next_period=review.goals_next_period,
            reviewer_comments=review.reviewer_comments,
            employee_comments=review.employee_comments,
            trust_score_at_review=review.trust_score_at_review,
            jobs_completed=review.jobs_completed,
            is_draft=review.is_draft,
            reviewer_id=review.reviewer_id,
            reviewer_name=reviewer.name if reviewer else None,
            reviewed_at=review.reviewed_at,
            acknowledged_by_employee=review.acknowledged_by_employee,
            acknowledged_at=review.acknowledged_at,
            created_at=review.created_at,
            updated_at=review.updated_at,
        ))

    return result
