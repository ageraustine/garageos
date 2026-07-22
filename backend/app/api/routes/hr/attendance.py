from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from datetime import date
from typing import Optional

from app.database import get_db
from app.api.deps import get_current_user
from app.services.hr.attendance_service import AttendanceService
from app.models.employee import Employee
from app.models.branch import Branch
from app.schemas.hr.attendance import (
    ClockInRequest,
    ClockOutRequest,
    AttendanceResponse,
    AttendanceWithEmployee,
    BranchAttendanceSummary,
)

router = APIRouter(prefix="/attendance", tags=["HR - Attendance"])


@router.post("/clock-in", response_model=AttendanceResponse)
async def clock_in(
    data: ClockInRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Clock in for the day. Any employee."""
    branch_id = current_user.branch_id
    if not branch_id:
        raise HTTPException(
            status_code=400,
            detail="HQ users cannot clock in to a branch"
        )

    try:
        service = AttendanceService(db)
        record = service.clock_in(
            employee_id=current_user.id,
            branch_id=branch_id,
            latitude=data.latitude,
            longitude=data.longitude,
        )

        return AttendanceResponse(
            id=record.id,
            employee_id=record.employee_id,
            branch_id=record.branch_id,
            attendance_date=record.attendance_date,
            clock_in=record.clock_in,
            clock_out=record.clock_out,
            total_minutes=record.total_minutes,
            overtime_minutes=record.overtime_minutes,
            clock_in_lat=record.clock_in_lat,
            clock_in_lng=record.clock_in_lng,
            clock_out_lat=record.clock_out_lat,
            clock_out_lng=record.clock_out_lng,
            notes=record.notes,
            created_at=record.created_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/clock-out", response_model=AttendanceResponse)
async def clock_out(
    data: ClockOutRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Clock out for the day. Any employee."""
    try:
        service = AttendanceService(db)
        record = service.clock_out(
            employee_id=current_user.id,
            latitude=data.latitude,
            longitude=data.longitude,
            notes=data.notes,
        )

        return AttendanceResponse(
            id=record.id,
            employee_id=record.employee_id,
            branch_id=record.branch_id,
            attendance_date=record.attendance_date,
            clock_in=record.clock_in,
            clock_out=record.clock_out,
            total_minutes=record.total_minutes,
            overtime_minutes=record.overtime_minutes,
            clock_in_lat=record.clock_in_lat,
            clock_in_lng=record.clock_in_lng,
            clock_out_lat=record.clock_out_lat,
            clock_out_lng=record.clock_out_lng,
            notes=record.notes,
            created_at=record.created_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/me/today", response_model=Optional[AttendanceResponse])
async def get_my_today_attendance(
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get today's attendance for current user."""
    service = AttendanceService(db)
    record = service.get_today_attendance(current_user.id)

    if not record:
        return None

    return AttendanceResponse(
        id=record.id,
        employee_id=record.employee_id,
        branch_id=record.branch_id,
        attendance_date=record.attendance_date,
        clock_in=record.clock_in,
        clock_out=record.clock_out,
        total_minutes=record.total_minutes,
        overtime_minutes=record.overtime_minutes,
        clock_in_lat=record.clock_in_lat,
        clock_in_lng=record.clock_in_lng,
        clock_out_lat=record.clock_out_lat,
        clock_out_lng=record.clock_out_lng,
        notes=record.notes,
        created_at=record.created_at,
    )


@router.get("/employees/{employee_id}", response_model=list[AttendanceResponse])
async def get_employee_attendance(
    employee_id: int,
    start_date: date,
    end_date: date,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get attendance records for an employee. Manager+ only."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can view employee attendance"
        )

    service = AttendanceService(db)
    records = service.get_employee_attendance(employee_id, start_date, end_date)

    return [
        AttendanceResponse(
            id=r.id,
            employee_id=r.employee_id,
            branch_id=r.branch_id,
            attendance_date=r.attendance_date,
            clock_in=r.clock_in,
            clock_out=r.clock_out,
            total_minutes=r.total_minutes,
            overtime_minutes=r.overtime_minutes,
            clock_in_lat=r.clock_in_lat,
            clock_in_lng=r.clock_in_lng,
            clock_out_lat=r.clock_out_lat,
            clock_out_lng=r.clock_out_lng,
            notes=r.notes,
            created_at=r.created_at,
        )
        for r in records
    ]


@router.get("/branch/{branch_id}/summary", response_model=BranchAttendanceSummary)
async def get_branch_attendance_summary(
    branch_id: int,
    target_date: Optional[date] = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get attendance summary for a branch. Manager+ only."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can view branch attendance"
        )

    # Managers can only see their branch
    if current_user.role == "manager" and current_user.branch_id != branch_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Managers can only view their own branch"
        )

    if target_date is None:
        target_date = date.today()

    branch = db.query(Branch).filter(Branch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    service = AttendanceService(db)
    summary = service.get_branch_summary(branch_id, current_user.chain_id, target_date)
    records = service.get_branch_attendance(branch_id, target_date)

    # Get employee info for each record
    records_with_employee = []
    for r in records:
        employee = db.query(Employee).filter(Employee.id == r.employee_id).first()
        records_with_employee.append(AttendanceWithEmployee(
            id=r.id,
            employee_id=r.employee_id,
            branch_id=r.branch_id,
            attendance_date=r.attendance_date,
            clock_in=r.clock_in,
            clock_out=r.clock_out,
            total_minutes=r.total_minutes,
            overtime_minutes=r.overtime_minutes,
            clock_in_lat=r.clock_in_lat,
            clock_in_lng=r.clock_in_lng,
            clock_out_lat=r.clock_out_lat,
            clock_out_lng=r.clock_out_lng,
            notes=r.notes,
            created_at=r.created_at,
            employee_name=employee.name if employee else "Unknown",
            employee_role=employee.role.value if employee else "unknown",
        ))

    return BranchAttendanceSummary(
        date=summary["date"],
        branch_id=summary["branch_id"],
        branch_name=branch.name,
        total_employees=summary["total_employees"],
        present=summary["present"],
        absent=summary["absent"],
        late_arrivals=summary["late_arrivals"],
        total_overtime_minutes=summary["total_overtime_minutes"],
        records=records_with_employee,
    )
