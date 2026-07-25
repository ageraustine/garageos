from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
from decimal import Decimal
from enum import Enum


class PaymentType(str, Enum):
    """Payment timing classification."""

    DEPOSIT = "deposit"
    BALANCE = "balance"
    FULL = "full"


class PaymentStatus(str, Enum):
    """M-Pesa STK Push states."""

    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Payment(SQLModel, table=True):
    """
    Payment record tied to Daraja/M-Pesa.
    idempotency_key ensures retries never double-charge.
    """

    __tablename__ = "payments"

    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="jobs.id", index=True)
    type: PaymentType
    payer_phone: str = Field(max_length=20)
    amount: Decimal = Field(max_digits=12, decimal_places=2)
    daraja_checkout_id: Optional[str] = Field(
        default=None, index=True, max_length=100
    )
    status: PaymentStatus = Field(default=PaymentStatus.PENDING)
    idempotency_key: str = Field(
        unique=True,
        index=True,
        max_length=100,
        description="Client-provided key to prevent double-charge",
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
