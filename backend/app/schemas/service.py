"""Service schemas."""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


# Request schemas
class StageCreate(BaseModel):
    """Stage for creating/updating a service."""
    name: str = Field(min_length=1, max_length=100)
    order: int = Field(ge=0)


class ServiceCreate(BaseModel):
    """Create a new service."""
    name: str = Field(min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    stages: List[StageCreate] = Field(default_factory=list)


class ServiceUpdate(BaseModel):
    """Update an existing service."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    stages: Optional[List[StageCreate]] = None  # Replace all stages if provided


# Quotation item schemas
class QuotationItemCreate(BaseModel):
    """Create a predefined pricing item for a service."""
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    price: float = Field(ge=0)
    is_labor: bool = False


class QuotationItemUpdate(BaseModel):
    """Update a quotation item."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    price: Optional[float] = Field(None, ge=0)
    is_labor: Optional[bool] = None
    is_active: Optional[bool] = None


class QuotationItemResponse(BaseModel):
    """Quotation item response."""
    id: int
    name: str
    description: Optional[str]
    price: float
    is_labor: bool
    is_active: bool


# Response schemas
class ServiceStageResponse(BaseModel):
    id: int
    name: str
    order: int


class ServiceResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    is_active: bool
    stages: List[ServiceStageResponse] = []
    quotation_items: List[QuotationItemResponse] = []


class ServiceListResponse(BaseModel):
    """Simplified service for listing."""
    id: int
    name: str
    description: Optional[str]


class JobServiceResponse(BaseModel):
    """Service attached to a job with current stage."""
    id: int
    service_id: int
    service_name: str
    current_stage_id: Optional[int]
    current_stage_name: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
