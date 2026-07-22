from sqlmodel import SQLModel, Field
from datetime import datetime, date
from typing import Optional
from enum import Enum


class ReviewPeriodType(str, Enum):
    """Review period type."""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUAL = "annual"
    PROBATION = "probation"


class PerformanceReview(SQLModel, table=True):
    """
    Periodic performance reviews for employees.
    Supports structured ratings and free-form feedback.
    """
    __tablename__ = "performance_reviews"

    id: Optional[int] = Field(default=None, primary_key=True)
    employee_id: int = Field(foreign_key="employees.id", index=True)
    chain_id: int = Field(foreign_key="chains.id", index=True)

    period_type: ReviewPeriodType
    period_start: date
    period_end: date

    # Ratings (1-5 scale)
    rating_quality: Optional[int] = Field(default=None, ge=1, le=5)
    rating_productivity: Optional[int] = Field(default=None, ge=1, le=5)
    rating_teamwork: Optional[int] = Field(default=None, ge=1, le=5)
    rating_punctuality: Optional[int] = Field(default=None, ge=1, le=5)
    rating_customer_service: Optional[int] = Field(default=None, ge=1, le=5)

    overall_rating: Optional[float] = Field(default=None, ge=1.0, le=5.0)

    # Free-form feedback
    strengths: Optional[str] = Field(default=None)
    areas_for_improvement: Optional[str] = Field(default=None)
    goals_next_period: Optional[str] = Field(default=None)
    reviewer_comments: Optional[str] = Field(default=None)
    employee_comments: Optional[str] = Field(default=None)

    # Trust Score correlation
    trust_score_at_review: Optional[float] = Field(default=None)
    jobs_completed: Optional[int] = Field(default=None)

    # Workflow
    is_draft: bool = Field(default=True)
    reviewer_id: int = Field(foreign_key="employees.id")
    reviewed_at: Optional[datetime] = Field(default=None)

    # Employee acknowledgment
    acknowledged_by_employee: bool = Field(default=False)
    acknowledged_at: Optional[datetime] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
