from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from decimal import Decimal


class LineItemCreate(BaseModel):
    kind: str = Field(pattern=r"^(critical|optional)$")
    label: str = Field(min_length=1, max_length=200)
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    justification_media_id: Optional[int] = None


class EstimateCreate(BaseModel):
    """Create estimate with line items."""

    line_items: List[LineItemCreate]


class EstimateApprove(BaseModel):
    """Customer approval - selects optional items."""

    selected_optional_ids: List[int] = Field(default_factory=list)


class LineItemResponse(BaseModel):
    id: int
    kind: str
    label: str
    price: Decimal
    justification_media_id: Optional[int]


class EstimateResponse(BaseModel):
    id: int
    job_id: int
    version: int
    approved_at: Optional[datetime]
    approved_ip: Optional[str]
    total_approved: Optional[Decimal]
    line_items: List[LineItemResponse]
    created_at: datetime
