from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from typing import Optional

from app.database import get_db
from app.api.deps import get_current_user
from app.services.hr.salary_service import SalaryService
from app.schemas.hr.salary import (
    SalaryCreate,
    SalaryResponse,
    CurrentSalaryResponse,
    SalaryHistoryResponse,
)
from app.models.employee import Employee

router = APIRouter(prefix="/salaries", tags=["HR - Salaries"])


@router.get("/employees/{employee_id}/salary", response_model=Optional[CurrentSalaryResponse])
async def get_current_salary(
    employee_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current salary for an employee. HQ/Manager only."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can view salaries"
        )

    service = SalaryService(db)
    salary = service.get_current_salary(employee_id, current_user.chain_id)

    if not salary:
        return None

    # Get employee info
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    return CurrentSalaryResponse(
        employee_id=employee_id,
        employee_name=employee.name,
        employee_role=employee.role.value,
        branch_name=None,  # Could be fetched if needed
        gross_monthly=salary.gross_monthly,
        effective_from=salary.effective_from,
        change_reason=salary.change_reason,
        salary_id=salary.id,
    )


@router.get("/employees/{employee_id}/salary/history", response_model=SalaryHistoryResponse)
async def get_salary_history(
    employee_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get salary history for an employee. HQ/Manager only."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can view salary history"
        )

    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.chain_id == current_user.chain_id
    ).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    service = SalaryService(db)
    history = service.get_salary_history(employee_id, current_user.chain_id)

    return SalaryHistoryResponse(
        employee_id=employee_id,
        employee_name=employee.name,
        history=[
            SalaryResponse(
                id=s.id,
                employee_id=s.employee_id,
                gross_monthly=s.gross_monthly,
                effective_from=s.effective_from,
                effective_to=s.effective_to,
                change_reason=s.change_reason,
                notes=s.notes,
                created_by_id=s.created_by_id,
                created_at=s.created_at,
            )
            for s in history
        ],
    )


@router.post("/employees/{employee_id}/salary", response_model=SalaryResponse)
async def set_salary(
    employee_id: int,
    data: SalaryCreate,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Set/update salary for an employee. HQ only."""
    if current_user.role != "hq":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ can set salaries"
        )

    try:
        service = SalaryService(db)
        salary = service.set_salary(
            employee_id=employee_id,
            chain_id=current_user.chain_id,
            gross_monthly=data.gross_monthly,
            effective_from=data.effective_from,
            change_reason=data.change_reason,
            created_by_id=current_user.id,
            notes=data.notes,
        )

        return SalaryResponse(
            id=salary.id,
            employee_id=salary.employee_id,
            gross_monthly=salary.gross_monthly,
            effective_from=salary.effective_from,
            effective_to=salary.effective_to,
            change_reason=salary.change_reason,
            notes=salary.notes,
            created_by_id=salary.created_by_id,
            created_at=salary.created_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/employees", response_model=list[CurrentSalaryResponse])
async def list_employees_with_salaries(
    branch_id: Optional[int] = None,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all employees with their current salaries. HQ/Manager only."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can view salaries"
        )

    # Managers can only see their branch
    if current_user.role == "manager":
        branch_id = current_user.branch_id

    service = SalaryService(db)
    employees = service.get_employees_with_salaries(
        current_user.chain_id,
        branch_id
    )

    result = []
    for item in employees:
        emp = item["employee"]
        salary = item["current_salary"]

        if salary:
            result.append(CurrentSalaryResponse(
                employee_id=emp.id,
                employee_name=emp.name,
                employee_role=emp.role.value,
                branch_name=None,
                gross_monthly=salary.gross_monthly,
                effective_from=salary.effective_from,
                change_reason=salary.change_reason,
                salary_id=salary.id,
            ))

    return result
