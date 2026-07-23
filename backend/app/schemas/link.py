"""Customer-facing schemas for Magic Link - minimal for 3G performance."""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from decimal import Decimal


class LinkVehicle(BaseModel):
    """Minimal vehicle info for customer."""

    plate: str
    make: str
    model: str
    year: Optional[int]


class LinkLineItem(BaseModel):
    """Line item for customer estimate view."""

    id: int
    kind: str  # critical | optional
    label: str
    price: Decimal
    is_labor: bool = False  # True for labor/service charges, False for parts
    media_url: Optional[str] = None  # Justification photo/voice


class LinkEstimate(BaseModel):
    """Estimate for customer view."""

    id: int
    version: int
    approved: bool
    approved_at: Optional[datetime]
    total_approved: Optional[Decimal]
    critical_total: Decimal
    optional_total: Decimal
    line_items: List[LinkLineItem]


class LinkMedia(BaseModel):
    """Media asset for customer view."""

    id: int
    type: str  # photo | voice
    url: str
    created_at: datetime


class LinkStage(BaseModel):
    """Service stage for customer view."""

    id: int
    name: str
    order: int
    completed: bool


class LinkService(BaseModel):
    """Service progress for customer view."""

    name: str
    stages: List[LinkStage]
    completed_count: int
    total_count: int


class CustomerJobResponse(BaseModel):
    """
    Full job state for customer Magic Link.
    Optimized for 3G - no nested relations beyond what's needed.
    """

    status: str
    status_label: str  # Human-readable status
    intake_at: datetime
    promised_ready_at: Optional[datetime]
    vehicle: LinkVehicle
    services: List[LinkService]  # Service progress
    estimate: Optional[LinkEstimate]
    media: List[LinkMedia]
    branch_name: Optional[str] = None
    chain_name: Optional[str] = None
    currency: str = "KES"  # Chain's currency code
    can_approve: bool  # True if estimate exists and not yet approved


class EstimateApproveRequest(BaseModel):
    """Customer estimate approval."""

    selected_optional_ids: List[int] = Field(default_factory=list)


class EstimateApproveResponse(BaseModel):
    """Response after approval."""

    approved: bool
    total_approved: Decimal
    approved_at: datetime
