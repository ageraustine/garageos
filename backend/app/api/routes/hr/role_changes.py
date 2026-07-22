from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session

from app.database import get_db
from app.api.deps import get_current_user
from app.services.hr.role_change_service import RoleChangeService
from app.models.employee import Employee
from app.models.branch import Branch
from app.schemas.hr.role_change import (
    RoleChangeResponse,
    RoleChangeHistoryResponse,
)

router = APIRouter(prefix="/role-changes", tags=["HR - Role Changes"])


@router.get("/employees/{employee_id}", response_model=RoleChangeHistoryResponse)
async def get_role_change_history(
    employee_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get role change history for an employee. Manager+ only."""
    if current_user.role not in ["hq", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only HQ or managers can view role history"
        )

    employee = db.query(Employee).filter(
        Employee.id == employee_id,
        Employee.chain_id == current_user.chain_id
    ).first()

    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    service = RoleChangeService(db)
    history = service.get_history(employee_id, current_user.chain_id)

    # Get branch names
    branches = {b.id: b.name for b in db.query(Branch).filter(
        Branch.chain_id == current_user.chain_id
    ).all()}

    # Get employee names for approved_by
    employee_ids = {h.approved_by_id for h in history}
    employees = {e.id: e.name for e in db.query(Employee).filter(
        Employee.id.in_(employee_ids)
    ).all()}

    history_responses = []
    for h in history:
        history_responses.append(RoleChangeResponse(
            id=h.id,
            employee_id=h.employee_id,
            chain_id=h.chain_id,
            change_type=h.change_type,
            from_role=h.from_role,
            to_role=h.to_role,
            from_branch_id=h.from_branch_id,
            from_branch_name=branches.get(h.from_branch_id),
            to_branch_id=h.to_branch_id,
            to_branch_name=branches.get(h.to_branch_id),
            new_salary_id=h.new_salary_id,
            effective_date=h.effective_date,
            reason=h.reason,
            approved_by_id=h.approved_by_id,
            approved_by_name=employees.get(h.approved_by_id),
            created_at=h.created_at,
        ))

    return RoleChangeHistoryResponse(
        employee_id=employee_id,
        employee_name=employee.name,
        current_role=employee.role,
        current_branch_name=branches.get(employee.branch_id),
        history=history_responses,
    )
