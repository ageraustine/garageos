"""
Trust Score computation service.

The Trust Score is the heart of GarageOS - a single number that represents
the trustworthiness of a garage, branch, or employee. It is:
- Computed, never written by hand
- Derived only from completed, paid jobs
- Un-gameable by design

See docs/architecture/trust-score.md for full algorithm spec.
"""

from decimal import Decimal
from datetime import datetime, timedelta, timezone
from typing import Optional, NamedTuple
from sqlmodel import Session, select, func
from app.models.job import Job, JobStatus
from app.models.estimate import Estimate
from app.models.line_item import LineItem
from app.models.media_asset import MediaAsset
from app.models.payment import Payment, PaymentStatus


class TrustSignals(NamedTuple):
    """Individual trust score signals."""

    estimate_accuracy: float
    verification_rate: float
    timeliness: float
    quality: float  # Return rate signal


class TrustScoreResult(NamedTuple):
    """Trust score computation result."""

    score: Optional[float]  # None if below minimum job threshold
    signals: TrustSignals
    job_count: int
    minimum_jobs: int
    is_building: bool  # True if below minimum threshold


# Weights per spec
WEIGHT_ESTIMATE_ACCURACY = 0.35
WEIGHT_VERIFICATION_RATE = 0.25
WEIGHT_TIMELINESS = 0.20
WEIGHT_QUALITY = 0.20

# Minimum jobs before showing a score
MINIMUM_JOBS = 20

# Rolling window: 90 days or 200 jobs, whichever is larger
ROLLING_WINDOW_DAYS = 90
ROLLING_WINDOW_MIN_JOBS = 200

# Default warranty window for comeback tracking (30 days)
WARRANTY_DAYS = 30


class TrustScoreService:
    """
    Computes trust scores for employees, branches, and chains.

    IMPORTANT: This service only computes - it never writes scores.
    The score is derived from job data and cached externally if needed.
    """

    def __init__(self, db: Session):
        self.db = db

    def compute_for_employee(self, employee_id: int) -> TrustScoreResult:
        """Compute trust score for an employee (jobs they touched)."""
        jobs = self._get_scored_jobs_for_employee(employee_id)
        return self._compute_score(jobs)

    def compute_for_branch(self, branch_id: int) -> TrustScoreResult:
        """Compute trust score for a branch (all its jobs)."""
        jobs = self._get_scored_jobs_for_branch(branch_id)
        return self._compute_score(jobs)

    def compute_for_chain(self, chain_id: int) -> TrustScoreResult:
        """Compute trust score for a chain (all branches)."""
        jobs = self._get_scored_jobs_for_chain(chain_id)
        return self._compute_score(jobs)

    def _get_scored_jobs_for_employee(self, employee_id: int) -> list[Job]:
        """Get paid jobs where employee was advisor or assigned mechanic."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=ROLLING_WINDOW_DAYS)

        query = (
            select(Job)
            .where(Job.status == JobStatus.PAID)
            .where(
                (Job.advisor_id == employee_id)
                | (Job.assigned_mechanic_id == employee_id)
            )
            .where(Job.created_at >= cutoff)
            .order_by(Job.created_at.desc())
            .limit(ROLLING_WINDOW_MIN_JOBS)
        )
        return list(self.db.exec(query).all())

    def _get_scored_jobs_for_branch(self, branch_id: int) -> list[Job]:
        """Get paid jobs for a branch within the rolling window."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=ROLLING_WINDOW_DAYS)

        query = (
            select(Job)
            .where(Job.status == JobStatus.PAID)
            .where(Job.branch_id == branch_id)
            .where(Job.created_at >= cutoff)
            .order_by(Job.created_at.desc())
            .limit(ROLLING_WINDOW_MIN_JOBS)
        )
        return list(self.db.exec(query).all())

    def _get_scored_jobs_for_chain(self, chain_id: int) -> list[Job]:
        """Get paid jobs for all branches in a chain."""
        from app.models.branch import Branch

        cutoff = datetime.now(timezone.utc) - timedelta(days=ROLLING_WINDOW_DAYS)

        # Get branch IDs for this chain
        branch_ids = self.db.exec(
            select(Branch.id).where(Branch.chain_id == chain_id)
        ).all()

        if not branch_ids:
            return []

        query = (
            select(Job)
            .where(Job.status == JobStatus.PAID)
            .where(Job.branch_id.in_(branch_ids))
            .where(Job.created_at >= cutoff)
            .order_by(Job.created_at.desc())
            .limit(ROLLING_WINDOW_MIN_JOBS)
        )
        return list(self.db.exec(query).all())

    def _compute_score(self, jobs: list[Job]) -> TrustScoreResult:
        """Compute composite trust score from a set of paid jobs."""
        job_count = len(jobs)

        if job_count == 0:
            return TrustScoreResult(
                score=None,
                signals=TrustSignals(0.0, 0.0, 0.0, 0.0),
                job_count=0,
                minimum_jobs=MINIMUM_JOBS,
                is_building=True,
            )

        # Compute each signal
        accuracy = self._compute_estimate_accuracy(jobs)
        verification = self._compute_verification_rate(jobs)
        timeliness = self._compute_timeliness(jobs)
        quality = self._compute_quality(jobs)

        signals = TrustSignals(accuracy, verification, timeliness, quality)

        # Below minimum threshold?
        if job_count < MINIMUM_JOBS:
            return TrustScoreResult(
                score=None,
                signals=signals,
                job_count=job_count,
                minimum_jobs=MINIMUM_JOBS,
                is_building=True,
            )

        # Composite score
        score = 100 * (
            WEIGHT_ESTIMATE_ACCURACY * accuracy
            + WEIGHT_VERIFICATION_RATE * verification
            + WEIGHT_TIMELINESS * timeliness
            + WEIGHT_QUALITY * quality
        )

        return TrustScoreResult(
            score=round(score, 1),
            signals=signals,
            job_count=job_count,
            minimum_jobs=MINIMUM_JOBS,
            is_building=False,
        )

    def _compute_estimate_accuracy(self, jobs: list[Job]) -> float:
        """
        Estimate Accuracy signal (weight: 0.35).

        accuracy = 1 - clamp((final_paid - approved_total) / approved_total, 0, 1)

        Only increases over approved hurt the score. Charging less never penalizes.
        """
        if not jobs:
            return 0.0

        total_accuracy = Decimal("0")
        scored_jobs = 0

        for job in jobs:
            # Get approved estimate
            estimate = self.db.exec(
                select(Estimate)
                .where(Estimate.job_id == job.id)
                .where(Estimate.approved_at.is_not(None))
                .order_by(Estimate.version.desc())
            ).first()

            if not estimate or not estimate.total_approved:
                continue

            # Get total paid
            total_paid = self.db.exec(
                select(func.sum(Payment.amount))
                .where(Payment.job_id == job.id)
                .where(Payment.status == PaymentStatus.SUCCESS)
            ).one()

            if total_paid is None:
                continue

            approved = estimate.total_approved
            paid = Decimal(str(total_paid))

            # Only penalize overcharges
            if paid > approved:
                overcharge_ratio = (paid - approved) / approved
                accuracy = Decimal("1") - min(overcharge_ratio, Decimal("1"))
            else:
                accuracy = Decimal("1")  # Perfect or undercharge

            total_accuracy += accuracy
            scored_jobs += 1

        if scored_jobs == 0:
            return 1.0  # No scored jobs = assume perfect

        return float(total_accuracy / scored_jobs)

    def _compute_verification_rate(self, jobs: list[Job]) -> float:
        """
        Verification Rate signal (weight: 0.25).

        verification = billed_line_items_with_customer_opened_media / billed_line_items

        Media must be opened by customer, not just attached.
        """
        if not jobs:
            return 0.0

        total_items = 0
        verified_items = 0

        for job in jobs:
            # Get latest approved estimate
            estimate = self.db.exec(
                select(Estimate)
                .where(Estimate.job_id == job.id)
                .where(Estimate.approved_at.is_not(None))
                .order_by(Estimate.version.desc())
            ).first()

            if not estimate:
                continue

            # Get line items
            line_items = self.db.exec(
                select(LineItem).where(LineItem.estimate_id == estimate.id)
            ).all()

            for item in line_items:
                total_items += 1

                # Check if justification media exists and was opened by customer
                if item.justification_media_id:
                    media = self.db.get(MediaAsset, item.justification_media_id)
                    if media and media.opened_by_customer_at:
                        verified_items += 1

        if total_items == 0:
            return 1.0  # No items = assume perfect

        return verified_items / total_items

    def _compute_timeliness(self, jobs: list[Job]) -> float:
        """
        Timeliness signal (weight: 0.20).

        timeliness = 1 - clamp((actual_ready - promised_ready) / promised_window, 0, 1)

        promised_window = time from intake to promised (the original promise).
        """
        if not jobs:
            return 0.0

        total_timeliness = 0.0
        scored_jobs = 0

        for job in jobs:
            if not job.promised_ready_at or not job.actual_ready_at:
                continue

            promised = job.promised_ready_at
            actual = job.actual_ready_at
            intake = job.intake_at

            # Calculate promised window (intake to promised)
            promised_window = (promised - intake).total_seconds()
            if promised_window <= 0:
                continue

            # Calculate delay (negative if early, positive if late)
            delay = (actual - promised).total_seconds()

            if delay <= 0:
                # On time or early
                timeliness = 1.0
            else:
                # Late - penalize proportionally to the promise window
                delay_ratio = delay / promised_window
                timeliness = max(0.0, 1.0 - delay_ratio)

            total_timeliness += timeliness
            scored_jobs += 1

        if scored_jobs == 0:
            return 1.0  # No scored jobs = assume perfect

        return total_timeliness / scored_jobs

    def _compute_quality(self, jobs: list[Job]) -> float:
        """
        Quality/Return Rate signal (weight: 0.20).

        return_penalty = same_fault_returns_within_warranty / total_jobs
        quality = 1 - clamp(return_penalty, 0, 1)

        This is the only pure quality signal - it can't be improved with
        better UX, only with repairs that hold.
        """
        if not jobs:
            return 0.0

        total_jobs = len(jobs)
        comebacks = 0

        for job in jobs:
            if job.is_comeback and job.original_job_id:
                # Verify the original job is within warranty window
                original = self.db.get(Job, job.original_job_id)
                if original and original.actual_ready_at:
                    warranty_cutoff = original.actual_ready_at + timedelta(
                        days=WARRANTY_DAYS
                    )
                    if job.intake_at <= warranty_cutoff:
                        comebacks += 1

        return_penalty = comebacks / total_jobs
        quality = max(0.0, 1.0 - return_penalty)

        return quality
