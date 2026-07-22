from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from typing import Optional

from app.database import get_db
from app.api.deps import get_current_user
from app.services.hr.payroll_service import PayrollService
from app.models.hr.payroll_period import PayrollStatus
from app.models.employee import Employee
from app.schemas.hr.payroll import (
    PayrollPeriodCreate,
    PayrollPeriodResponse,
    PayrollPeriodDetailResponse,
    PayrollItemResponse,
    PayrollItemEmployee,
    PayrollStatusUpdate,
    ProcessPayrollRequest,
    ProcessPayrollResponse,
    ManualPaymentRequest,
)

router = APIRouter(prefix="/payroll", tags=["HR - Payroll"])


@router.get("/periods", response_model=list[PayrollPeriodResponse])
async def list_payroll_periods(
    year: Optional[int] = None,
    payroll_status: Optional[PayrollStatus] = None,
    limit: int = 50,
    offset: int = 0,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List payroll periods. HQ/Manager only."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can view payroll"
        )

    service = PayrollService(db)
    periods = service.list_periods(
        chain_id=current_user.chain_id,
        year=year,
        status=payroll_status,
        limit=limit,
        offset=offset,
    )

    return [
        PayrollPeriodResponse(
            id=p.id,
            chain_id=p.chain_id,
            period_year=p.period_year,
            period_month=p.period_month,
            branch_id=p.branch_id,
            status=p.status,
            total_gross=p.total_gross,
            total_net=p.total_net,
            employee_count=p.employee_count,
            created_by_id=p.created_by_id,
            approved_by_id=p.approved_by_id,
            approved_at=p.approved_at,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        for p in periods
    ]


@router.post("/periods", response_model=PayrollPeriodResponse)
async def create_payroll_period(
    data: PayrollPeriodCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new payroll period. HQ only."""
    if current_user.role != "hq":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ can create payroll periods"
        )

    try:
        service = PayrollService(db)
        period = service.create_period(
            chain_id=current_user.chain_id,
            period_year=data.period_year,
            period_month=data.period_month,
            created_by_id=current_user.id,
            branch_id=data.branch_id,
        )

        return PayrollPeriodResponse(
            id=period.id,
            chain_id=period.chain_id,
            period_year=period.period_year,
            period_month=period.period_month,
            branch_id=period.branch_id,
            status=period.status,
            total_gross=period.total_gross,
            total_net=period.total_net,
            employee_count=period.employee_count,
            created_by_id=period.created_by_id,
            approved_by_id=period.approved_by_id,
            approved_at=period.approved_at,
            created_at=period.created_at,
            updated_at=period.updated_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/periods/{period_id}", response_model=PayrollPeriodDetailResponse)
async def get_payroll_period(
    period_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get payroll period with items. HQ/Manager only."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can view payroll"
        )

    service = PayrollService(db)
    period = service.get_period(period_id, current_user.chain_id)

    if not period:
        raise HTTPException(status_code=404, detail="Payroll period not found")

    items = service.get_period_items(period_id, current_user.chain_id)

    # Get employee info for each item
    item_responses = []
    for item in items:
        employee = db.query(Employee).filter(Employee.id == item.employee_id).first()
        item_responses.append(PayrollItemResponse(
            id=item.id,
            payroll_period_id=item.payroll_period_id,
            employee_id=item.employee_id,
            employee=PayrollItemEmployee(
                id=employee.id,
                name=employee.name,
                role=employee.role.value,
                branch_name=None,
            ) if employee else None,
            gross_amount=item.gross_amount,
            deductions=item.deductions,
            net_amount=item.net_amount,
            method=item.method,
            phone_number=item.phone_number,
            status=item.status,
            mpesa_receipt=item.mpesa_receipt,
            manual_reference=item.manual_reference,
            manual_paid_at=item.manual_paid_at,
            failure_reason=item.failure_reason,
            retry_count=item.retry_count,
            created_at=item.created_at,
            updated_at=item.updated_at,
        ))

    return PayrollPeriodDetailResponse(
        id=period.id,
        chain_id=period.chain_id,
        period_year=period.period_year,
        period_month=period.period_month,
        branch_id=period.branch_id,
        status=period.status,
        total_gross=period.total_gross,
        total_net=period.total_net,
        employee_count=period.employee_count,
        created_by_id=period.created_by_id,
        approved_by_id=period.approved_by_id,
        approved_at=period.approved_at,
        created_at=period.created_at,
        updated_at=period.updated_at,
        items=item_responses,
    )


@router.post("/periods/{period_id}/generate")
async def generate_payroll_items(
    period_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate payroll items from employee salaries. HQ only."""
    if current_user.role != "hq":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ can generate payroll items"
        )

    try:
        service = PayrollService(db)
        items = service.generate_items(period_id, current_user.chain_id)
        return {"generated": len(items)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/periods/{period_id}/status", response_model=PayrollPeriodResponse)
async def update_payroll_status(
    period_id: int,
    data: PayrollStatusUpdate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update payroll period status. HQ only."""
    if current_user.role != "hq":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ can update payroll status"
        )

    try:
        service = PayrollService(db)
        period = service.update_period_status(
            period_id=period_id,
            chain_id=current_user.chain_id,
            new_status=data.status,
            approved_by_id=current_user.id,
        )

        return PayrollPeriodResponse(
            id=period.id,
            chain_id=period.chain_id,
            period_year=period.period_year,
            period_month=period.period_month,
            branch_id=period.branch_id,
            status=period.status,
            total_gross=period.total_gross,
            total_net=period.total_net,
            employee_count=period.employee_count,
            created_by_id=period.created_by_id,
            approved_by_id=period.approved_by_id,
            approved_at=period.approved_at,
            created_at=period.created_at,
            updated_at=period.updated_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/periods/{period_id}/process", response_model=ProcessPayrollResponse)
async def process_payroll_disbursements(
    period_id: int,
    data: ProcessPayrollRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Process M-Pesa B2C disbursements. HQ only."""
    if current_user.role != "hq":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ can process payroll disbursements"
        )

    try:
        # Note: In production, inject DarajaService here
        service = PayrollService(db, daraja_service=None)
        result = await service.process_mpesa_disbursements(
            period_id=period_id,
            chain_id=current_user.chain_id,
            item_ids=data.employee_ids,
        )

        return ProcessPayrollResponse(
            initiated=result["initiated"],
            failed=result["failed"],
            skipped=result["skipped"],
            details=result["details"],
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/items/{item_id}/manual-pay", response_model=PayrollItemResponse)
async def mark_manual_payment(
    item_id: int,
    data: ManualPaymentRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a payroll item as manually paid. HQ/Manager only."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can mark manual payments"
        )

    try:
        service = PayrollService(db)
        item = service.mark_manual_payment(
            item_id=item_id,
            chain_id=current_user.chain_id,
            reference=data.reference,
            recorded_by_id=current_user.id,
        )

        return PayrollItemResponse(
            id=item.id,
            payroll_period_id=item.payroll_period_id,
            employee_id=item.employee_id,
            gross_amount=item.gross_amount,
            deductions=item.deductions,
            net_amount=item.net_amount,
            method=item.method,
            phone_number=item.phone_number,
            status=item.status,
            mpesa_receipt=item.mpesa_receipt,
            manual_reference=item.manual_reference,
            manual_paid_at=item.manual_paid_at,
            failure_reason=item.failure_reason,
            retry_count=item.retry_count,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
