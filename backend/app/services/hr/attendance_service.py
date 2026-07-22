from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from datetime import date, datetime
from typing import Optional

from app.models.hr.attendance import AttendanceRecord
from app.models.employee import Employee
from app.models.branch import Branch

# Default working hours (8 hours = 480 minutes)
STANDARD_WORKING_MINUTES = 480


class AttendanceService:
    """Attendance tracking with clock in/out."""

    def __init__(self, db: Session):
        self.db = db

    def clock_in(
        self,
        employee_id: int,
        branch_id: int,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> AttendanceRecord:
        """Clock in for the day."""
        today = date.today()
        now = datetime.utcnow()

        # Check if already clocked in today
        existing = self.db.query(AttendanceRecord).filter(
            and_(
                AttendanceRecord.employee_id == employee_id,
                AttendanceRecord.attendance_date == today
            )
        ).first()

        if existing:
            if existing.clock_in:
                raise ValueError("Already clocked in today")
            # Update existing record
            existing.clock_in = now
            existing.clock_in_lat = latitude
            existing.clock_in_lng = longitude
            existing.updated_at = now
            self.db.add(existing)
            self.db.commit()
            self.db.refresh(existing)
            return existing

        # Create new record
        record = AttendanceRecord(
            employee_id=employee_id,
            branch_id=branch_id,
            attendance_date=today,
            clock_in=now,
            clock_in_lat=latitude,
            clock_in_lng=longitude,
            created_at=now,
            updated_at=now,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def clock_out(
        self,
        employee_id: int,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        notes: Optional[str] = None,
    ) -> AttendanceRecord:
        """Clock out for the day."""
        today = date.today()
        now = datetime.utcnow()

        record = self.db.query(AttendanceRecord).filter(
            and_(
                AttendanceRecord.employee_id == employee_id,
                AttendanceRecord.attendance_date == today
            )
        ).first()

        if not record:
            raise ValueError("No clock-in record found for today")
        if not record.clock_in:
            raise ValueError("Must clock in before clocking out")
        if record.clock_out:
            raise ValueError("Already clocked out today")

        record.clock_out = now
        record.clock_out_lat = latitude
        record.clock_out_lng = longitude
        record.notes = notes
        record.updated_at = now

        # Calculate total minutes
        if record.clock_in:
            delta = now - record.clock_in
            record.total_minutes = int(delta.total_seconds() / 60)
            # Calculate overtime
            if record.total_minutes > STANDARD_WORKING_MINUTES:
                record.overtime_minutes = record.total_minutes - STANDARD_WORKING_MINUTES
            else:
                record.overtime_minutes = 0

        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def get_today_attendance(self, employee_id: int) -> Optional[AttendanceRecord]:
        """Get today's attendance record for an employee."""
        return self.db.query(AttendanceRecord).filter(
            and_(
                AttendanceRecord.employee_id == employee_id,
                AttendanceRecord.attendance_date == date.today()
            )
        ).first()

    def get_employee_attendance(
        self,
        employee_id: int,
        start_date: date,
        end_date: date
    ) -> list[AttendanceRecord]:
        """Get attendance records for an employee in a date range."""
        return self.db.query(AttendanceRecord).filter(
            and_(
                AttendanceRecord.employee_id == employee_id,
                AttendanceRecord.attendance_date >= start_date,
                AttendanceRecord.attendance_date <= end_date
            )
        ).order_by(AttendanceRecord.attendance_date.desc()).all()

    def get_branch_attendance(
        self,
        branch_id: int,
        target_date: date
    ) -> list[AttendanceRecord]:
        """Get all attendance records for a branch on a specific date."""
        return self.db.query(AttendanceRecord).filter(
            and_(
                AttendanceRecord.branch_id == branch_id,
                AttendanceRecord.attendance_date == target_date
            )
        ).all()

    def get_branch_summary(
        self,
        branch_id: int,
        chain_id: int,
        target_date: date
    ) -> dict:
        """Get attendance summary for a branch on a specific date."""
        # Get total employees in branch
        total_employees = self.db.query(func.count(Employee.id)).filter(
            and_(
                Employee.branch_id == branch_id,
                Employee.chain_id == chain_id,
                Employee.is_active == True
            )
        ).scalar() or 0

        # Get attendance records
        records = self.get_branch_attendance(branch_id, target_date)

        present = len([r for r in records if r.clock_in])
        absent = total_employees - present

        # Late arrivals (after 9 AM assuming standard start time)
        late_count = 0
        total_overtime = 0
        for record in records:
            if record.clock_in and record.clock_in.hour >= 9:
                late_count += 1
            if record.overtime_minutes:
                total_overtime += record.overtime_minutes

        return {
            "date": target_date,
            "branch_id": branch_id,
            "total_employees": total_employees,
            "present": present,
            "absent": absent,
            "late_arrivals": late_count,
            "total_overtime_minutes": total_overtime,
        }
