from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import date, datetime
from typing import Optional

from app.models.hr.performance_review import PerformanceReview, ReviewPeriodType
from app.models.employee import Employee


class ReviewService:
    """Performance review management."""

    def __init__(self, db: Session):
        self.db = db

    def create_review(
        self,
        employee_id: int,
        chain_id: int,
        reviewer_id: int,
        period_type: ReviewPeriodType,
        period_start: date,
        period_end: date,
        ratings: Optional[dict] = None,
        feedback: Optional[dict] = None,
    ) -> PerformanceReview:
        """Create a new performance review (as draft)."""
        # Verify employee exists
        employee = self.db.query(Employee).filter(
            and_(Employee.id == employee_id, Employee.chain_id == chain_id)
        ).first()
        if not employee:
            raise ValueError("Employee not found in this chain")

        # Check for existing review in same period
        existing = self.db.query(PerformanceReview).filter(
            and_(
                PerformanceReview.employee_id == employee_id,
                PerformanceReview.period_start == period_start,
                PerformanceReview.period_end == period_end,
            )
        ).first()
        if existing:
            raise ValueError("Review already exists for this period")

        review = PerformanceReview(
            employee_id=employee_id,
            chain_id=chain_id,
            reviewer_id=reviewer_id,
            period_type=period_type,
            period_start=period_start,
            period_end=period_end,
            is_draft=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        # Apply ratings if provided
        if ratings:
            review.rating_quality = ratings.get("quality")
            review.rating_productivity = ratings.get("productivity")
            review.rating_teamwork = ratings.get("teamwork")
            review.rating_punctuality = ratings.get("punctuality")
            review.rating_customer_service = ratings.get("customer_service")
            self._calculate_overall_rating(review)

        # Apply feedback if provided
        if feedback:
            review.strengths = feedback.get("strengths")
            review.areas_for_improvement = feedback.get("areas_for_improvement")
            review.goals_next_period = feedback.get("goals_next_period")
            review.reviewer_comments = feedback.get("reviewer_comments")

        self.db.add(review)
        self.db.commit()
        self.db.refresh(review)
        return review

    def update_review(
        self,
        review_id: int,
        chain_id: int,
        reviewer_id: int,
        ratings: Optional[dict] = None,
        feedback: Optional[dict] = None,
    ) -> PerformanceReview:
        """Update a draft review."""
        review = self.db.query(PerformanceReview).filter(
            and_(
                PerformanceReview.id == review_id,
                PerformanceReview.chain_id == chain_id,
                PerformanceReview.reviewer_id == reviewer_id,
            )
        ).first()

        if not review:
            raise ValueError("Review not found or not authorized")
        if not review.is_draft:
            raise ValueError("Cannot update submitted review")

        if ratings:
            if "quality" in ratings:
                review.rating_quality = ratings["quality"]
            if "productivity" in ratings:
                review.rating_productivity = ratings["productivity"]
            if "teamwork" in ratings:
                review.rating_teamwork = ratings["teamwork"]
            if "punctuality" in ratings:
                review.rating_punctuality = ratings["punctuality"]
            if "customer_service" in ratings:
                review.rating_customer_service = ratings["customer_service"]
            self._calculate_overall_rating(review)

        if feedback:
            if "strengths" in feedback:
                review.strengths = feedback["strengths"]
            if "areas_for_improvement" in feedback:
                review.areas_for_improvement = feedback["areas_for_improvement"]
            if "goals_next_period" in feedback:
                review.goals_next_period = feedback["goals_next_period"]
            if "reviewer_comments" in feedback:
                review.reviewer_comments = feedback["reviewer_comments"]

        review.updated_at = datetime.utcnow()
        self.db.add(review)
        self.db.commit()
        self.db.refresh(review)
        return review

    def submit_review(
        self,
        review_id: int,
        chain_id: int,
        reviewer_id: int,
    ) -> PerformanceReview:
        """Submit/finalize a review."""
        review = self.db.query(PerformanceReview).filter(
            and_(
                PerformanceReview.id == review_id,
                PerformanceReview.chain_id == chain_id,
                PerformanceReview.reviewer_id == reviewer_id,
            )
        ).first()

        if not review:
            raise ValueError("Review not found or not authorized")
        if not review.is_draft:
            raise ValueError("Review already submitted")

        # Ensure at least one rating is provided
        has_rating = any([
            review.rating_quality,
            review.rating_productivity,
            review.rating_teamwork,
            review.rating_punctuality,
            review.rating_customer_service,
        ])
        if not has_rating:
            raise ValueError("At least one rating is required to submit")

        review.is_draft = False
        review.reviewed_at = datetime.utcnow()
        review.updated_at = datetime.utcnow()

        self.db.add(review)
        self.db.commit()
        self.db.refresh(review)
        return review

    def acknowledge_review(
        self,
        review_id: int,
        employee_id: int,
        employee_comments: Optional[str] = None,
    ) -> PerformanceReview:
        """Employee acknowledges their review."""
        review = self.db.query(PerformanceReview).filter(
            and_(
                PerformanceReview.id == review_id,
                PerformanceReview.employee_id == employee_id,
            )
        ).first()

        if not review:
            raise ValueError("Review not found")
        if review.is_draft:
            raise ValueError("Cannot acknowledge draft review")
        if review.acknowledged_by_employee:
            raise ValueError("Review already acknowledged")

        review.acknowledged_by_employee = True
        review.acknowledged_at = datetime.utcnow()
        if employee_comments:
            review.employee_comments = employee_comments
        review.updated_at = datetime.utcnow()

        self.db.add(review)
        self.db.commit()
        self.db.refresh(review)
        return review

    def get_review(self, review_id: int, chain_id: int) -> Optional[PerformanceReview]:
        """Get a review by ID."""
        return self.db.query(PerformanceReview).filter(
            and_(
                PerformanceReview.id == review_id,
                PerformanceReview.chain_id == chain_id,
            )
        ).first()

    def list_reviews(
        self,
        chain_id: int,
        employee_id: Optional[int] = None,
        reviewer_id: Optional[int] = None,
        is_draft: Optional[bool] = None,
        period_type: Optional[ReviewPeriodType] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[PerformanceReview]:
        """List reviews with filters."""
        query = self.db.query(PerformanceReview).filter(
            PerformanceReview.chain_id == chain_id
        )

        if employee_id:
            query = query.filter(PerformanceReview.employee_id == employee_id)
        if reviewer_id:
            query = query.filter(PerformanceReview.reviewer_id == reviewer_id)
        if is_draft is not None:
            query = query.filter(PerformanceReview.is_draft == is_draft)
        if period_type:
            query = query.filter(PerformanceReview.period_type == period_type)

        return query.order_by(PerformanceReview.created_at.desc()).offset(offset).limit(limit).all()

    def get_employee_history(
        self,
        employee_id: int,
        chain_id: int
    ) -> list[PerformanceReview]:
        """Get all reviews for an employee (submitted only)."""
        return self.db.query(PerformanceReview).filter(
            and_(
                PerformanceReview.employee_id == employee_id,
                PerformanceReview.chain_id == chain_id,
                PerformanceReview.is_draft == False,
            )
        ).order_by(PerformanceReview.period_end.desc()).all()

    def _calculate_overall_rating(self, review: PerformanceReview) -> None:
        """Calculate overall rating from individual ratings."""
        ratings = [
            review.rating_quality,
            review.rating_productivity,
            review.rating_teamwork,
            review.rating_punctuality,
            review.rating_customer_service,
        ]
        valid_ratings = [r for r in ratings if r is not None]
        if valid_ratings:
            review.overall_rating = round(sum(valid_ratings) / len(valid_ratings), 2)
        else:
            review.overall_rating = None
