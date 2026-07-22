from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
from decimal import Decimal
from enum import Enum


class PayrollItemStatus(str, Enum):
    """Payment status for individual payroll item."""
    PENDING = "pending"
    PROCESSING = "processing"
    SUCCESS = "success"
    FAILED = "failed"
    MANUAL = "manual"


class DisbursementMethod(str, Enum):
    """How salary was/will be paid."""
    MPESA_B2C = "mpesa_b2c"
    MANUAL = "manual"


class PayrollItem(SQLModel, table=True):
    """
    Individual employee payment within a payroll period.
    Tracks both M-Pesa B2C and manual payment methods.
    """
    __tablename__ = "payroll_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    payroll_period_id: int = Field(foreign_key="payroll_periods.id", index=True)
    employee_id: int = Field(foreign_key="employees.id", index=True)

    # Salary breakdown
    gross_amount: Decimal = Field(max_digits=12, decimal_places=2)
    deductions: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=2)
    net_amount: Decimal = Field(max_digits=12, decimal_places=2)

    # Disbursement info
    method: DisbursementMethod = Field(default=DisbursementMethod.MPESA_B2C)
    phone_number: str = Field(max_length=20)

    # Payment status
    status: PayrollItemStatus = Field(default=PayrollItemStatus.PENDING, index=True)

    # M-Pesa B2C tracking
    daraja_conversation_id: Optional[str] = Field(default=None, index=True, max_length=100)
    daraja_originator_conversation_id: Optional[str] = Field(default=None, max_length=100)
    mpesa_receipt: Optional[str] = Field(default=None, index=True, max_length=50)

    # Manual payment tracking
    manual_reference: Optional[str] = Field(default=None, max_length=100)
    manual_paid_at: Optional[datetime] = Field(default=None)
    manual_recorded_by_id: Optional[int] = Field(default=None, foreign_key="employees.id")

    # Error tracking
    failure_reason: Optional[str] = Field(default=None, max_length=500)
    retry_count: int = Field(default=0)

    # Idempotency for M-Pesa
    idempotency_key: str = Field(unique=True, index=True, max_length=100)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
