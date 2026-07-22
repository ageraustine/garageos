from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from decimal import Decimal
from app.models.hr.payroll_period import PayrollStatus
from app.models.hr.payroll_item import PayrollItemStatus, DisbursementMethod


class PayrollPeriodCreate(BaseModel):
    """Create a new payroll period."""
    period_year: int = Field(..., ge=2020, le=2100)
    period_month: int = Field(..., ge=1, le=12)
    branch_id: Optional[int] = None  # None = all branches


class PayrollPeriodResponse(BaseModel):
    """Payroll period summary."""
    id: int
    chain_id: int
    period_year: int
    period_month: int
    branch_id: Optional[int]
    branch_name: Optional[str] = None
    status: PayrollStatus
    total_gross: Decimal
    total_net: Decimal
    employee_count: int
    created_by_id: int
    created_by_name: Optional[str] = None
    approved_by_id: Optional[int]
    approved_by_name: Optional[str] = None
    approved_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PayrollItemEmployee(BaseModel):
    """Employee info for payroll item."""
    id: int
    name: str
    role: str
    branch_name: Optional[str]


class PayrollItemResponse(BaseModel):
    """Individual payroll item."""
    id: int
    payroll_period_id: int
    employee_id: int
    employee: Optional[PayrollItemEmployee] = None
    gross_amount: Decimal
    deductions: Decimal
    net_amount: Decimal
    method: DisbursementMethod
    phone_number: str
    status: PayrollItemStatus
    mpesa_receipt: Optional[str]
    manual_reference: Optional[str]
    manual_paid_at: Optional[datetime]
    failure_reason: Optional[str]
    retry_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PayrollPeriodDetailResponse(PayrollPeriodResponse):
    """Payroll period with items."""
    items: list[PayrollItemResponse] = []


class PayrollStatusUpdate(BaseModel):
    """Update payroll period status."""
    status: PayrollStatus


class ProcessPayrollRequest(BaseModel):
    """Request to process payroll disbursements."""
    method: DisbursementMethod = DisbursementMethod.MPESA_B2C
    employee_ids: Optional[list[int]] = None  # None = all pending


class ProcessPayrollResponse(BaseModel):
    """Result of payroll processing."""
    initiated: int
    failed: int
    skipped: int
    details: list[dict]


class ManualPaymentRequest(BaseModel):
    """Mark a payroll item as manually paid."""
    reference: str = Field(..., min_length=1, max_length=100)


class PayrollItemUpdate(BaseModel):
    """Update a payroll item."""
    gross_amount: Optional[Decimal] = Field(None, gt=0)
    deductions: Optional[Decimal] = Field(None, ge=0)
    method: Optional[DisbursementMethod] = None
    phone_number: Optional[str] = Field(None, max_length=20)
