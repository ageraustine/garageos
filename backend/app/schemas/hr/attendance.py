from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional


class ClockInRequest(BaseModel):
    """Clock in request with optional location."""
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)


class ClockOutRequest(BaseModel):
    """Clock out request with optional location."""
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    notes: Optional[str] = Field(None, max_length=500)


class AttendanceResponse(BaseModel):
    """Attendance record response."""
    id: int
    employee_id: int
    branch_id: int
    attendance_date: date
    clock_in: Optional[datetime]
    clock_out: Optional[datetime]
    total_minutes: Optional[int]
    overtime_minutes: Optional[int]
    clock_in_lat: Optional[float]
    clock_in_lng: Optional[float]
    clock_out_lat: Optional[float]
    clock_out_lng: Optional[float]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AttendanceWithEmployee(AttendanceResponse):
    """Attendance with employee info."""
    employee_name: str
    employee_role: str


class BranchAttendanceSummary(BaseModel):
    """Branch attendance summary for a date."""
    date: date
    branch_id: int
    branch_name: str
    total_employees: int
    present: int
    absent: int
    late_arrivals: int
    total_overtime_minutes: int
    records: list[AttendanceWithEmployee]


class AttendanceReportRequest(BaseModel):
    """Request for attendance report."""
    start_date: date
    end_date: date
    branch_id: Optional[int] = None
    employee_id: Optional[int] = None


class EmployeeAttendanceSummary(BaseModel):
    """Summary of employee attendance over a period."""
    employee_id: int
    employee_name: str
    days_present: int
    days_absent: int
    total_hours: float
    total_overtime_hours: float
    late_arrivals: int
