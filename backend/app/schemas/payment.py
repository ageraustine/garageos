from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from decimal import Decimal


class PaymentCreate(BaseModel):
    """Per API contract: POST /link/:token/pay."""

    type: str = Field(pattern=r"^(deposit|balance|full)$")
    payer_phone: str = Field(pattern=r"^\+?[0-9]{10,15}$")
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    idempotency_key: str = Field(min_length=1, max_length=100)


class PaymentResponse(BaseModel):
    id: int
    job_id: int
    type: str
    payer_phone: str
    amount: Decimal
    daraja_checkout_id: Optional[str]
    status: str
    created_at: datetime


class STKPushRequest(BaseModel):
    """Request to initiate M-Pesa STK Push."""
    phone: str = Field(pattern=r"^\+?[0-9]{10,15}$")
    amount: int = Field(gt=0, description="Amount in KES (integer)")
    idempotency_key: str = Field(min_length=1, max_length=100)


class STKPushResponse(BaseModel):
    """Response after initiating STK Push."""
    payment_id: int
    checkout_request_id: str
    customer_message: str
    status: str


class DarajaCallback(BaseModel):
    """M-Pesa callback payload (nested structure)."""
    Body: dict
