from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
from decimal import Decimal
from enum import Enum


class ApprovalType(str, Enum):
    """How the estimate was approved."""

    CUSTOMER = "customer"  # Approved by customer via magic link
    INTERNAL = "internal"  # Approved internally by HQ or manager


class Estimate(SQLModel, table=True):
    """
    Immutable estimate snapshot. Edits create new version.
    Per invariant #5: post-approval changes require fresh approval.
    """

    __tablename__ = "estimates"

    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="jobs.id", index=True)
    version: int = Field(default=1, description="New version per re-approval")
    approved_at: Optional[datetime] = Field(default=None)
    approved_ip: Optional[str] = Field(default=None, max_length=45)
    approved_by_id: Optional[int] = Field(
        default=None,
        foreign_key="employees.id",
        description="Staff who approved (null for customer approval)",
    )
    approval_type: Optional[ApprovalType] = Field(
        default=None, description="customer or internal approval"
    )
    total_approved: Optional[Decimal] = Field(
        default=None,
        max_digits=12,
        decimal_places=2,
        description="Locked once approved",
    )
    paid_amount: Decimal = Field(
        default=Decimal("0"),
        max_digits=12,
        decimal_places=2,
        description="Amount paid so far",
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @property
    def balance(self) -> Decimal:
        """Calculate remaining balance."""
        if self.total_approved is None:
            return Decimal("0")
        return self.total_approved - self.paid_amount

    @property
    def is_pending_approval(self) -> bool:
        """Check if estimate is pending approval."""
        return self.approved_at is None
