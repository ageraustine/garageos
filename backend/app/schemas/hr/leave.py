from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional
from app.models.hr.leave_request import LeaveType, LeaveStatus


class LeaveRequestCreate(BaseModel):
    """Create a new leave request."""
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: Optional[str] = Field(None, max_length=500)


class LeaveRequestUpdate(BaseModel):
    """Update a pending leave request."""
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    reason: Optional[str] = Field(None, max_length=500)


class LeaveRequestResponse(BaseModel):
    """Leave request response."""
    id: int
    employee_id: int
    employee_name: Optional[str] = None
    chain_id: int
    leave_type: LeaveType
    start_date: date
    end_date: date
    days_requested: int
    reason: Optional[str]
    status: LeaveStatus
    reviewed_by_id: Optional[int]
    reviewed_by_name: Optional[str] = None
    reviewed_at: Optional[datetime]
    rejection_reason: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class LeaveApproveRequest(BaseModel):
    """Approve a leave request."""
    pass  # No body needed


class LeaveRejectRequest(BaseModel):
    """Reject a leave request."""
    rejection_reason: str = Field(..., min_length=1, max_length=500)


class LeaveBalanceItem(BaseModel):
    """Balance for a specific leave type."""
    entitled: int
    used: int
    pending: int
    remaining: int


class LeaveBalanceResponse(BaseModel):
    """Leave balance for an employee."""
    employee_id: int
    employee_name: str
    year: int
    annual: LeaveBalanceItem
    sick: LeaveBalanceItem
    maternity: Optional[LeaveBalanceItem] = None
    paternity: Optional[LeaveBalanceItem] = None
    compassionate: LeaveBalanceItem
