from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
from decimal import Decimal
from enum import Enum


class PayrollStatus(str, Enum):
    """Payroll processing stages."""
    DRAFT = "draft"
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    PROCESSING = "processing"
    COMPLETED = "completed"
    PARTIALLY_PAID = "partially_paid"


class PayrollPeriod(SQLModel, table=True):
    """
    Monthly payroll batch for a chain.
    HQ creates one period per month; can cover all branches.
    """
    __tablename__ = "payroll_periods"

    id: Optional[int] = Field(default=None, primary_key=True)
    chain_id: int = Field(foreign_key="chains.id", index=True)

    period_year: int = Field(index=True)
    period_month: int = Field(ge=1, le=12)

    # Optional branch filter - NULL means all branches
    branch_id: Optional[int] = Field(default=None, foreign_key="branches.id")

    status: PayrollStatus = Field(default=PayrollStatus.DRAFT, index=True)

    # Aggregated totals (updated when items change)
    total_gross: Decimal = Field(default=Decimal("0"), max_digits=14, decimal_places=2)
    total_net: Decimal = Field(default=Decimal("0"), max_digits=14, decimal_places=2)
    employee_count: int = Field(default=0)

    # Workflow tracking
    created_by_id: int = Field(foreign_key="employees.id")
    approved_by_id: Optional[int] = Field(default=None, foreign_key="employees.id")
    approved_at: Optional[datetime] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
