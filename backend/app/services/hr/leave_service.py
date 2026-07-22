from sqlalchemy.orm import Session
from sqlalchemy import and_, func, extract
from datetime import date, datetime
from typing import Optional

from app.models.hr.leave_request import LeaveRequest, LeaveType, LeaveStatus
from app.models.employee import Employee

# Default leave entitlements per year
DEFAULT_ENTITLEMENTS = {
    LeaveType.ANNUAL: 21,
    LeaveType.SICK: 10,
    LeaveType.MATERNITY: 90,
    LeaveType.PATERNITY: 14,
    LeaveType.COMPASSIONATE: 5,
    LeaveType.UNPAID: 0,  # No limit
}


class LeaveService:
    """Leave request management with approval workflow."""

    def __init__(self, db: Session):
        self.db = db

    def create_request(
        self,
        employee_id: int,
        chain_id: int,
        leave_type: LeaveType,
        start_date: date,
        end_date: date,
        reason: Optional[str] = None,
    ) -> LeaveRequest:
        """Create a new leave request."""
        if end_date < start_date:
            raise ValueError("End date must be after start date")

        # Calculate working days (simple: exclude weekends)
        days_requested = self._calculate_working_days(start_date, end_date)

        # Check for overlapping requests
        overlapping = self.db.query(LeaveRequest).filter(
            and_(
                LeaveRequest.employee_id == employee_id,
                LeaveRequest.status.in_([LeaveStatus.PENDING, LeaveStatus.APPROVED]),
                LeaveRequest.start_date <= end_date,
                LeaveRequest.end_date >= start_date,
            )
        ).first()

        if overlapping:
            raise ValueError("Leave request overlaps with existing request")

        request = LeaveRequest(
            employee_id=employee_id,
            chain_id=chain_id,
            leave_type=leave_type,
            start_date=start_date,
            end_date=end_date,
            days_requested=days_requested,
            reason=reason,
            status=LeaveStatus.PENDING,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(request)
        self.db.commit()
        self.db.refresh(request)
        return request

    def approve_request(
        self,
        request_id: int,
        chain_id: int,
        reviewed_by_id: int
    ) -> LeaveRequest:
        """Approve a leave request."""
        request = self.db.query(LeaveRequest).filter(
            and_(
                LeaveRequest.id == request_id,
                LeaveRequest.chain_id == chain_id
            )
        ).first()

        if not request:
            raise ValueError("Leave request not found")
        if request.status != LeaveStatus.PENDING:
            raise ValueError("Can only approve pending requests")

        request.status = LeaveStatus.APPROVED
        request.reviewed_by_id = reviewed_by_id
        request.reviewed_at = datetime.utcnow()
        request.updated_at = datetime.utcnow()

        self.db.add(request)
        self.db.commit()
        self.db.refresh(request)
        return request

    def reject_request(
        self,
        request_id: int,
        chain_id: int,
        reviewed_by_id: int,
        rejection_reason: str
    ) -> LeaveRequest:
        """Reject a leave request."""
        request = self.db.query(LeaveRequest).filter(
            and_(
                LeaveRequest.id == request_id,
                LeaveRequest.chain_id == chain_id
            )
        ).first()

        if not request:
            raise ValueError("Leave request not found")
        if request.status != LeaveStatus.PENDING:
            raise ValueError("Can only reject pending requests")

        request.status = LeaveStatus.REJECTED
        request.reviewed_by_id = reviewed_by_id
        request.reviewed_at = datetime.utcnow()
        request.rejection_reason = rejection_reason
        request.updated_at = datetime.utcnow()

        self.db.add(request)
        self.db.commit()
        self.db.refresh(request)
        return request

    def cancel_request(
        self,
        request_id: int,
        employee_id: int
    ) -> LeaveRequest:
        """Cancel a leave request (by the employee who created it)."""
        request = self.db.query(LeaveRequest).filter(
            and_(
                LeaveRequest.id == request_id,
                LeaveRequest.employee_id == employee_id
            )
        ).first()

        if not request:
            raise ValueError("Leave request not found")
        if request.status not in [LeaveStatus.PENDING, LeaveStatus.APPROVED]:
            raise ValueError("Can only cancel pending or approved requests")

        request.status = LeaveStatus.CANCELLED
        request.updated_at = datetime.utcnow()

        self.db.add(request)
        self.db.commit()
        self.db.refresh(request)
        return request

    def get_balance(self, employee_id: int, chain_id: int, year: int) -> dict:
        """Get leave balance for an employee for a specific year."""
        # Get all approved and pending leave requests for the year
        requests = self.db.query(LeaveRequest).filter(
            and_(
                LeaveRequest.employee_id == employee_id,
                LeaveRequest.chain_id == chain_id,
                extract('year', LeaveRequest.start_date) == year,
                LeaveRequest.status.in_([LeaveStatus.APPROVED, LeaveStatus.PENDING])
            )
        ).all()

        # Calculate used and pending by type
        used_by_type: dict[LeaveType, int] = {}
        pending_by_type: dict[LeaveType, int] = {}

        for req in requests:
            if req.status == LeaveStatus.APPROVED:
                used_by_type[req.leave_type] = used_by_type.get(req.leave_type, 0) + req.days_requested
            else:
                pending_by_type[req.leave_type] = pending_by_type.get(req.leave_type, 0) + req.days_requested

        # Build balance response
        balance = {}
        for leave_type, entitled in DEFAULT_ENTITLEMENTS.items():
            used = used_by_type.get(leave_type, 0)
            pending = pending_by_type.get(leave_type, 0)
            remaining = max(0, entitled - used - pending) if entitled > 0 else 0

            balance[leave_type.value] = {
                "entitled": entitled,
                "used": used,
                "pending": pending,
                "remaining": remaining,
            }

        return balance

    def list_requests(
        self,
        chain_id: int,
        branch_id: Optional[int] = None,
        employee_id: Optional[int] = None,
        status: Optional[LeaveStatus] = None,
        limit: int = 50,
        offset: int = 0
    ) -> list[LeaveRequest]:
        """List leave requests with filters."""
        query = self.db.query(LeaveRequest).filter(
            LeaveRequest.chain_id == chain_id
        )

        if employee_id:
            query = query.filter(LeaveRequest.employee_id == employee_id)

        if status:
            query = query.filter(LeaveRequest.status == status)

        if branch_id:
            # Join with employee to filter by branch
            query = query.join(Employee).filter(Employee.branch_id == branch_id)

        return query.order_by(LeaveRequest.created_at.desc()).offset(offset).limit(limit).all()

    def _calculate_working_days(self, start_date: date, end_date: date) -> int:
        """Calculate working days between two dates (excludes weekends)."""
        days = 0
        current = start_date
        while current <= end_date:
            if current.weekday() < 5:  # Monday = 0, Friday = 4
                days += 1
            current = date.fromordinal(current.toordinal() + 1)
        return days
