from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from app.models.job import JobStatus


class JobCreate(BaseModel):
    """Per API contract: POST /jobs from plate."""

    plate: str = Field(min_length=1, max_length=20)
    vehicle_make: Optional[str] = Field(None, max_length=50)
    vehicle_model: Optional[str] = Field(None, max_length=50)
    branch_id: int
    advisor_id: int
    service_ids: List[int] = Field(default_factory=list)  # Selected services
    assigned_employee_ids: List[int] = Field(default_factory=list)  # Assigned employees
    customer_name: Optional[str] = Field(None, max_length=100)
    customer_phone: Optional[str] = Field(None, max_length=20)
    fuel_level: Optional[int] = Field(None, ge=0, le=100)
    damage_pins: Optional[List[dict]] = None


class AssignedEmployee(BaseModel):
    """Employee assigned to a job."""

    id: int
    name: str
    role: str


class JobStatusUpdate(BaseModel):
    status: JobStatus
    assigned_mechanic_id: Optional[int] = None
    promised_ready_at: Optional[datetime] = None
    actual_ready_at: Optional[datetime] = None


class JobResponse(BaseModel):
    id: int
    vehicle_id: int
    branch_id: int
    advisor_id: int
    assigned_mechanic_id: Optional[int]
    customer_name: Optional[str]
    customer_phone: Optional[str]
    status: str
    intake_at: datetime
    promised_ready_at: Optional[datetime]
    actual_ready_at: Optional[datetime]
    magic_link_token: str
    created_at: datetime


class JobCreateResponse(BaseModel):
    """Per API contract: returns job_id and magic_link_token."""

    job_id: int
    magic_link_token: str


class JobListItem(BaseModel):
    """Job item for list view with vehicle info."""

    id: int
    plate: str
    vehicle_make: str
    vehicle_model: str
    customer_name: Optional[str]
    customer_phone: Optional[str]
    status: str
    status_label: str
    intake_at: datetime
    promised_ready_at: Optional[datetime]
    magic_link_token: str
    services: List[str] = []  # Service names
    assigned_employees: List[AssignedEmployee] = []
    created_at: datetime


class QuotationTemplateItem(BaseModel):
    """Quotation template item for estimates."""
    id: int
    name: str
    price: float
    is_labor: bool


class JobServiceDetail(BaseModel):
    """Service attached to job with stage progress."""

    id: int
    service_id: int
    service_name: str
    stages: List[dict]  # [{id, name, order}]
    current_stage_id: Optional[int]
    current_stage_name: Optional[str]
    completed_stage_ids: List[int] = []  # Stages that have been checked off
    quotation_items: List[QuotationTemplateItem] = []  # Template items for estimates
    started_at: Optional[datetime]
    completed_at: Optional[datetime]


class StageToggleRequest(BaseModel):
    """Request to toggle a stage completion."""

    stage_id: int


class StageToggleResponse(BaseModel):
    """Response after toggling a stage."""

    stage_id: int
    completed: bool
    completed_stage_ids: List[int]


class JobDetail(BaseModel):
    """Full job detail for management view."""

    id: int
    plate: str
    vehicle_make: str
    vehicle_model: str
    vehicle_year: Optional[int]
    customer_name: Optional[str]
    customer_phone: Optional[str]
    status: str
    status_label: str
    next_statuses: List[str]  # Valid transitions
    intake_at: datetime
    promised_ready_at: Optional[datetime]
    actual_ready_at: Optional[datetime]
    magic_link_token: str
    services: List[JobServiceDetail]
    assigned_employees: List[AssignedEmployee] = []
    has_estimate: bool
    estimate_approved: bool
    created_at: datetime


class JobAssignmentUpdate(BaseModel):
    """Update job assignments."""

    assigned_employee_ids: List[int]
