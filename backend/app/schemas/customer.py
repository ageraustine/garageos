from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from decimal import Decimal


class CustomerCreate(BaseModel):
    phone: str = Field(pattern=r"^\+?[0-9]{10,15}$")
    name: str = Field(min_length=2, max_length=100)
    email: Optional[str] = Field(None, max_length=200)
    address: Optional[str] = Field(None, max_length=500)
    tags: Optional[List[str]] = None
    consent_flags: Optional[dict] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[str] = Field(None, max_length=200)
    address: Optional[str] = Field(None, max_length=500)
    tags: Optional[List[str]] = None
    consent_flags: Optional[dict] = None


class CustomerResponse(BaseModel):
    id: int
    phone: str
    name: str
    email: Optional[str]
    address: Optional[str]
    tags: Optional[List[str]]
    consent_flags: Optional[dict]
    created_at: datetime


# Customer list item with summary stats
class CustomerListItem(BaseModel):
    id: int
    phone: str
    name: str
    email: Optional[str]
    tags: Optional[List[str]]
    vehicle_count: int
    job_count: int
    total_spent: Decimal
    last_visit: Optional[datetime]
    created_at: datetime


# Vehicle summary for customer detail
class CustomerVehicle(BaseModel):
    id: int
    plate: str
    make: str
    model: str
    year: Optional[int]
    job_count: int
    last_service: Optional[datetime]


# Job summary for customer detail
class CustomerJob(BaseModel):
    id: int
    vehicle_plate: str
    vehicle_make: str
    vehicle_model: str
    status: str
    status_label: str
    services: List[str]
    total_paid: Optional[Decimal]
    intake_at: datetime
    completed_at: Optional[datetime]


# Note on customer
class CustomerNoteCreate(BaseModel):
    content: str = Field(min_length=1, max_length=1000)
    is_pinned: bool = False


class CustomerNoteResponse(BaseModel):
    id: int
    content: str
    is_pinned: bool
    created_by_id: int
    created_by_name: str
    created_at: datetime


# Full customer detail
class CustomerDetail(BaseModel):
    id: int
    phone: str
    name: str
    email: Optional[str]
    address: Optional[str]
    tags: Optional[List[str]]
    consent_flags: Optional[dict]
    created_at: datetime
    # Stats
    vehicle_count: int
    job_count: int
    total_spent: Decimal
    last_visit: Optional[datetime]
    # Related data
    vehicles: List[CustomerVehicle]
    recent_jobs: List[CustomerJob]
    notes: List[CustomerNoteResponse]
