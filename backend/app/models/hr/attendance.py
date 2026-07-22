from sqlmodel import SQLModel, Field
from datetime import datetime, date
from typing import Optional


class AttendanceRecord(SQLModel, table=True):
    """
    Daily attendance tracking for employees.
    One record per employee per day.
    """
    __tablename__ = "attendance_records"

    id: Optional[int] = Field(default=None, primary_key=True)
    employee_id: int = Field(foreign_key="employees.id", index=True)
    branch_id: int = Field(foreign_key="branches.id", index=True)

    attendance_date: date = Field(index=True)

    clock_in: Optional[datetime] = Field(default=None)
    clock_out: Optional[datetime] = Field(default=None)

    # Computed on clock_out (in minutes)
    total_minutes: Optional[int] = Field(default=None)
    overtime_minutes: Optional[int] = Field(default=0)

    # Location verification
    clock_in_lat: Optional[float] = Field(default=None)
    clock_in_lng: Optional[float] = Field(default=None)
    clock_out_lat: Optional[float] = Field(default=None)
    clock_out_lng: Optional[float] = Field(default=None)

    notes: Optional[str] = Field(default=None, max_length=500)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
