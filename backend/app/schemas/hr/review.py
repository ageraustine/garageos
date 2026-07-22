from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional
from app.models.hr.performance_review import ReviewPeriodType


class PerformanceReviewCreate(BaseModel):
    """Create a new performance review."""
    employee_id: int
    period_type: ReviewPeriodType
    period_start: date
    period_end: date
    rating_quality: Optional[int] = Field(None, ge=1, le=5)
    rating_productivity: Optional[int] = Field(None, ge=1, le=5)
    rating_teamwork: Optional[int] = Field(None, ge=1, le=5)
    rating_punctuality: Optional[int] = Field(None, ge=1, le=5)
    rating_customer_service: Optional[int] = Field(None, ge=1, le=5)
    strengths: Optional[str] = None
    areas_for_improvement: Optional[str] = None
    goals_next_period: Optional[str] = None
    reviewer_comments: Optional[str] = None


class PerformanceReviewUpdate(BaseModel):
    """Update a draft review."""
    rating_quality: Optional[int] = Field(None, ge=1, le=5)
    rating_productivity: Optional[int] = Field(None, ge=1, le=5)
    rating_teamwork: Optional[int] = Field(None, ge=1, le=5)
    rating_punctuality: Optional[int] = Field(None, ge=1, le=5)
    rating_customer_service: Optional[int] = Field(None, ge=1, le=5)
    strengths: Optional[str] = None
    areas_for_improvement: Optional[str] = None
    goals_next_period: Optional[str] = None
    reviewer_comments: Optional[str] = None


class PerformanceReviewResponse(BaseModel):
    """Performance review response."""
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    chain_id: int
    period_type: ReviewPeriodType
    period_start: date
    period_end: date
    rating_quality: Optional[int]
    rating_productivity: Optional[int]
    rating_teamwork: Optional[int]
    rating_punctuality: Optional[int]
    rating_customer_service: Optional[int]
    overall_rating: Optional[float]
    strengths: Optional[str]
    areas_for_improvement: Optional[str]
    goals_next_period: Optional[str]
    reviewer_comments: Optional[str]
    employee_comments: Optional[str]
    trust_score_at_review: Optional[float]
    jobs_completed: Optional[int]
    is_draft: bool
    reviewer_id: int
    reviewer_name: Optional[str] = None
    reviewed_at: Optional[datetime]
    acknowledged_by_employee: bool
    acknowledged_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EmployeeCommentRequest(BaseModel):
    """Employee's comment on their review."""
    employee_comments: str = Field(..., min_length=1, max_length=2000)


class ReviewListFilters(BaseModel):
    """Filters for listing reviews."""
    employee_id: Optional[int] = None
    period_type: Optional[ReviewPeriodType] = None
    is_draft: Optional[bool] = None
    reviewer_id: Optional[int] = None
