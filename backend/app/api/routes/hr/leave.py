from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from datetime import date
from typing import Optional

from app.database import get_db
from app.api.deps import get_current_user
from app.services.hr.leave_service import LeaveService
from app.models.hr.leave_request import LeaveStatus
from app.models.employee import Employee
from app.schemas.hr.leave import (
    LeaveRequestCreate,
    LeaveRequestUpdate,
    LeaveRequestResponse,
    LeaveRejectRequest,
    LeaveBalanceResponse,
    LeaveBalanceItem,
)

router = APIRouter(prefix="/leave", tags=["HR - Leave"])


@router.get("/requests", response_model=list[LeaveRequestResponse])
async def list_leave_requests(
    leave_status: Optional[LeaveStatus] = None,
    branch_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List leave requests. Manager+ only."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can view all leave requests"
        )

    # Managers can only see their branch
    if current_user.role == "manager":
        branch_id = current_user.branch_id

    service = LeaveService(db)
    requests = service.list_requests(
        chain_id=current_user.chain_id,
        branch_id=branch_id,
        status=leave_status,
        limit=limit,
        offset=offset,
    )

    result = []
    for req in requests:
        employee = db.query(Employee).filter(Employee.id == req.employee_id).first()
        reviewer = None
        if req.reviewed_by_id:
            reviewer = db.query(Employee).filter(Employee.id == req.reviewed_by_id).first()

        result.append(LeaveRequestResponse(
            id=req.id,
            employee_id=req.employee_id,
            employee_name=employee.name if employee else None,
            chain_id=req.chain_id,
            leave_type=req.leave_type,
            start_date=req.start_date,
            end_date=req.end_date,
            days_requested=req.days_requested,
            reason=req.reason,
            status=req.status,
            reviewed_by_id=req.reviewed_by_id,
            reviewed_by_name=reviewer.name if reviewer else None,
            reviewed_at=req.reviewed_at,
            rejection_reason=req.rejection_reason,
            created_at=req.created_at,
            updated_at=req.updated_at,
        ))

    return result


@router.get("/requests/me", response_model=list[LeaveRequestResponse])
async def get_my_leave_requests(
    leave_status: Optional[LeaveStatus] = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get my leave requests."""
    service = LeaveService(db)
    requests = service.list_requests(
        chain_id=current_user.chain_id,
        employee_id=current_user.id,
        status=leave_status,
    )

    return [
        LeaveRequestResponse(
            id=req.id,
            employee_id=req.employee_id,
            chain_id=req.chain_id,
            leave_type=req.leave_type,
            start_date=req.start_date,
            end_date=req.end_date,
            days_requested=req.days_requested,
            reason=req.reason,
            status=req.status,
            reviewed_by_id=req.reviewed_by_id,
            reviewed_at=req.reviewed_at,
            rejection_reason=req.rejection_reason,
            created_at=req.created_at,
            updated_at=req.updated_at,
        )
        for req in requests
    ]


@router.post("/requests", response_model=LeaveRequestResponse)
async def create_leave_request(
    data: LeaveRequestCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Submit a new leave request."""
    try:
        service = LeaveService(db)
        request = service.create_request(
            employee_id=current_user.id,
            chain_id=current_user.chain_id,
            leave_type=data.leave_type,
            start_date=data.start_date,
            end_date=data.end_date,
            reason=data.reason,
        )

        return LeaveRequestResponse(
            id=request.id,
            employee_id=request.employee_id,
            chain_id=request.chain_id,
            leave_type=request.leave_type,
            start_date=request.start_date,
            end_date=request.end_date,
            days_requested=request.days_requested,
            reason=request.reason,
            status=request.status,
            reviewed_by_id=request.reviewed_by_id,
            reviewed_at=request.reviewed_at,
            rejection_reason=request.rejection_reason,
            created_at=request.created_at,
            updated_at=request.updated_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/requests/{request_id}/approve", response_model=LeaveRequestResponse)
async def approve_leave_request(
    request_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Approve a leave request. Manager+ only."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can approve leave requests"
        )

    try:
        service = LeaveService(db)
        request = service.approve_request(
            request_id=request_id,
            chain_id=current_user.chain_id,
            reviewed_by_id=current_user.id,
        )

        return LeaveRequestResponse(
            id=request.id,
            employee_id=request.employee_id,
            chain_id=request.chain_id,
            leave_type=request.leave_type,
            start_date=request.start_date,
            end_date=request.end_date,
            days_requested=request.days_requested,
            reason=request.reason,
            status=request.status,
            reviewed_by_id=request.reviewed_by_id,
            reviewed_at=request.reviewed_at,
            rejection_reason=request.rejection_reason,
            created_at=request.created_at,
            updated_at=request.updated_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/requests/{request_id}/reject", response_model=LeaveRequestResponse)
async def reject_leave_request(
    request_id: int,
    data: LeaveRejectRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reject a leave request. Manager+ only."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can reject leave requests"
        )

    try:
        service = LeaveService(db)
        request = service.reject_request(
            request_id=request_id,
            chain_id=current_user.chain_id,
            reviewed_by_id=current_user.id,
            rejection_reason=data.rejection_reason,
        )

        return LeaveRequestResponse(
            id=request.id,
            employee_id=request.employee_id,
            chain_id=request.chain_id,
            leave_type=request.leave_type,
            start_date=request.start_date,
            end_date=request.end_date,
            days_requested=request.days_requested,
            reason=request.reason,
            status=request.status,
            reviewed_by_id=request.reviewed_by_id,
            reviewed_at=request.reviewed_at,
            rejection_reason=request.rejection_reason,
            created_at=request.created_at,
            updated_at=request.updated_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/requests/{request_id}/cancel", response_model=LeaveRequestResponse)
async def cancel_leave_request(
    request_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel a leave request. Only by the employee who created it."""
    try:
        service = LeaveService(db)
        request = service.cancel_request(
            request_id=request_id,
            employee_id=current_user.id,
        )

        return LeaveRequestResponse(
            id=request.id,
            employee_id=request.employee_id,
            chain_id=request.chain_id,
            leave_type=request.leave_type,
            start_date=request.start_date,
            end_date=request.end_date,
            days_requested=request.days_requested,
            reason=request.reason,
            status=request.status,
            reviewed_by_id=request.reviewed_by_id,
            reviewed_at=request.reviewed_at,
            rejection_reason=request.rejection_reason,
            created_at=request.created_at,
            updated_at=request.updated_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/balance/{employee_id}", response_model=LeaveBalanceResponse)
async def get_leave_balance(
    employee_id: int,
    year: Optional[int] = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get leave balance for an employee."""
    # Can view own balance or manager+ can view any
    if employee_id != current_user.id and current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only view your own leave balance"
        )

    if year is None:
        year = date.today().year

    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.chain_id == current_user.chain_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    service = LeaveService(db)
    balance = service.get_balance(employee_id, current_user.chain_id, year)

    return LeaveBalanceResponse(
        employee_id=employee_id,
        employee_name=employee.name,
        year=year,
        annual=LeaveBalanceItem(**balance["annual"]),
        sick=LeaveBalanceItem(**balance["sick"]),
        maternity=LeaveBalanceItem(**balance.get("maternity", {"entitled": 0, "used": 0, "pending": 0, "remaining": 0})),
        paternity=LeaveBalanceItem(**balance.get("paternity", {"entitled": 0, "used": 0, "pending": 0, "remaining": 0})),
        compassionate=LeaveBalanceItem(**balance["compassionate"]),
    )
