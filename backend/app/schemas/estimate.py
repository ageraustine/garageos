from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from decimal import Decimal


class LineItemCreate(BaseModel):
    kind: str = Field(pattern=r"^(critical|optional)$")
    label: str = Field(min_length=1, max_length=200)
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    is_labor: bool = False
    justification_media_id: Optional[int] = None


class EstimateCreate(BaseModel):
    """Create estimate with line items."""

    line_items: List[LineItemCreate]


class EstimateApprove(BaseModel):
    """Customer approval - selects optional items."""

    selected_optional_ids: List[int] = Field(default_factory=list)


class InternalApprovalRequest(BaseModel):
    """Internal approval by HQ or manager."""

    selected_optional_ids: List[int] = Field(default_factory=list)
    notes: Optional[str] = Field(default=None, max_length=500)


class PaymentUpdateRequest(BaseModel):
    """Update payment amount on estimate."""

    paid_amount: Decimal = Field(ge=0, max_digits=12, decimal_places=2)


class LineItemResponse(BaseModel):
    id: int
    kind: str
    label: str
    price: Decimal
    is_labor: bool = False
    justification_media_id: Optional[int]


class ApproverInfo(BaseModel):
    """Info about who approved the estimate."""

    id: int
    name: str
    role: str


class EstimateResponse(BaseModel):
    id: int
    job_id: int
    version: int
    approved_at: Optional[datetime]
    approved_ip: Optional[str]
    approved_by_id: Optional[int]
    approval_type: Optional[str]  # "customer" or "internal"
    approver: Optional[ApproverInfo] = None
    total_approved: Optional[Decimal]
    paid_amount: Decimal = Decimal("0")
    balance: Decimal = Decimal("0")
    is_pending_approval: bool = True
    line_items: List[LineItemResponse]
    created_at: datetime
