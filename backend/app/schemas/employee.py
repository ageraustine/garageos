from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from app.models.employee import EmployeeRole


class EmployeeCreate(BaseModel):
    """Create a new employee in the chain."""

    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(pattern=r"^\+?[0-9]{10,15}$")
    pin: str = Field(min_length=4, max_length=6, pattern=r"^[0-9]{4,6}$")
    role: EmployeeRole
    branch_id: Optional[int] = None  # None for HQ role


class EmployeeUpdate(BaseModel):
    """Update employee details."""

    name: Optional[str] = Field(None, min_length=2, max_length=100)
    role: Optional[EmployeeRole] = None
    branch_id: Optional[int] = None
    is_active: Optional[bool] = None


class EmployeeResponse(BaseModel):
    """Employee info for API responses."""

    id: int
    name: str
    phone: str
    role: str
    branch_id: Optional[int]
    branch_name: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime]


class EmployeeListItem(BaseModel):
    """Employee item for list view."""

    id: int
    name: str
    phone: str
    role: str
    role_label: str
    branch_id: Optional[int]
    branch_name: Optional[str]
    is_active: bool
    created_at: datetime
