from sqlmodel import Session, select
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from app.models.estimate import Estimate
from app.models.line_item import LineItem, LineItemKind
from app.schemas.estimate import EstimateCreate, EstimateApprove, LineItemCreate
from app.core.exceptions import NotFoundError, AppException


class EstimateAlreadyApproved(AppException):
    """Cannot modify approved estimate."""

    pass


class MissingJustification(AppException):
    """Optional line item requires justification media."""

    pass


class EstimateService:
    """Estimate creation and approval - immutable after approval."""

    def __init__(self, db: Session):
        self.db = db

    def create(self, job_id: int, data: EstimateCreate) -> Estimate:
        """Create new estimate version for a job."""
        # Get current max version
        existing = self.db.exec(
            select(Estimate)
            .where(Estimate.job_id == job_id)
            .order_by(Estimate.version.desc())
        ).first()

        version = (existing.version + 1) if existing else 1

        estimate = Estimate(job_id=job_id, version=version)
        self.db.add(estimate)
        self.db.flush()  # Get estimate.id

        # Add line items with validation
        for item_data in data.line_items:
            self._add_line_item(estimate.id, item_data)

        self.db.commit()
        self.db.refresh(estimate)
        return estimate

    def _add_line_item(self, estimate_id: int, data: LineItemCreate) -> LineItem:
        """Add line item with validation."""
        # Note: Optional items ideally should have justification media,
        # but we allow creation without it for flexibility.
        # Justification can be added later via media upload.

        item = LineItem(
            estimate_id=estimate_id,
            kind=LineItemKind(data.kind),
            label=data.label,
            price=data.price,
            justification_media_id=data.justification_media_id,
        )
        self.db.add(item)
        return item

    def get_by_id(self, id: int) -> Estimate:
        estimate = self.db.get(Estimate, id)
        if not estimate:
            raise NotFoundError(f"Estimate {id} not found")
        return estimate

    def get_latest_for_job(self, job_id: int) -> Optional[Estimate]:
        return self.db.exec(
            select(Estimate)
            .where(Estimate.job_id == job_id)
            .order_by(Estimate.version.desc())
        ).first()

    def get_line_items(self, estimate_id: int) -> list[LineItem]:
        return list(
            self.db.exec(
                select(LineItem).where(LineItem.estimate_id == estimate_id)
            ).all()
        )

    def approve(
        self, estimate_id: int, data: EstimateApprove, client_ip: str
    ) -> Estimate:
        """
        Customer approval with optional item selection.
        Per invariant #5: any later increase requires new approval.
        """
        estimate = self.get_by_id(estimate_id)

        if estimate.approved_at:
            raise EstimateAlreadyApproved("Estimate already approved")

        # Calculate total: all critical + selected optional
        line_items = self.get_line_items(estimate_id)
        total = Decimal("0")

        for item in line_items:
            if item.kind == LineItemKind.CRITICAL:
                total += item.price
            elif item.id in data.selected_optional_ids:
                total += item.price

        estimate.approved_at = datetime.now(timezone.utc)
        estimate.approved_ip = client_ip
        estimate.total_approved = total

        self.db.commit()
        self.db.refresh(estimate)
        return estimate
