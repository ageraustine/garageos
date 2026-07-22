from sqlmodel import SQLModel, Field
from datetime import datetime, date
from typing import Optional
from enum import Enum


class LeaveType(str, Enum):
    """Types of leave."""
    ANNUAL = "annual"
    SICK = "sick"
    MATERNITY = "maternity"
    PATERNITY = "paternity"
    UNPAID = "unpaid"
    COMPASSIONATE = "compassionate"


class LeaveStatus(str, Enum):
    """Leave request workflow."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class LeaveRequest(SQLModel, table=True):
    """
    Leave/vacation requests with approval workflow.
    """
    __tablename__ = "leave_requests"

    id: Optional[int] = Field(default=None, primary_key=True)
    employee_id: int = Field(foreign_key="employees.id", index=True)
    chain_id: int = Field(foreign_key="chains.id", index=True)

    leave_type: LeaveType
    start_date: date = Field(index=True)
    end_date: date

    # Working days (excludes weekends/holidays)
    days_requested: int

    reason: Optional[str] = Field(default=None, max_length=500)

    status: LeaveStatus = Field(default=LeaveStatus.PENDING, index=True)

    # Approval workflow
    reviewed_by_id: Optional[int] = Field(default=None, foreign_key="employees.id")
    reviewed_at: Optional[datetime] = Field(default=None)
    rejection_reason: Optional[str] = Field(default=None, max_length=500)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
