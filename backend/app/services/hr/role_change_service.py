from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime
from typing import Optional
from decimal import Decimal

from app.models.hr.role_change import RoleChange, RoleChangeType
from app.models.hr.employee_salary import EmployeeSalary, SalaryChangeReason
from app.models.employee import Employee, EmployeeRole
from app.services.hr.salary_service import SalaryService


# Role hierarchy for determining promotion vs demotion
ROLE_HIERARCHY = {
    EmployeeRole.MECHANIC: 1,
    EmployeeRole.ADVISOR: 2,
    EmployeeRole.MANAGER: 3,
    EmployeeRole.HQ: 4,
}


class RoleChangeService:
    """Role/position change tracking with audit trail."""

    def __init__(self, db: Session):
        self.db = db
        self.salary_service = SalaryService(db)

    def record_role_change(
        self,
        employee_id: int,
        chain_id: int,
        from_role: EmployeeRole,
        to_role: EmployeeRole,
        from_branch_id: Optional[int],
        to_branch_id: Optional[int],
        approved_by_id: int,
        reason: Optional[str] = None,
        new_salary: Optional[Decimal] = None,
        effective_date: Optional[datetime] = None,
    ) -> RoleChange:
        """Record a role/branch change for an employee."""
        if effective_date is None:
            effective_date = datetime.utcnow()

        # Determine change type
        change_type = self._determine_change_type(
            from_role, to_role, from_branch_id, to_branch_id
        )

        # Create salary record if new salary provided
        new_salary_id = None
        if new_salary:
            salary_reason = (
                SalaryChangeReason.PROMOTION
                if change_type == RoleChangeType.PROMOTION
                else SalaryChangeReason.DEMOTION
                if change_type == RoleChangeType.DEMOTION
                else SalaryChangeReason.ADJUSTMENT
            )
            salary = self.salary_service.set_salary(
                employee_id=employee_id,
                chain_id=chain_id,
                gross_monthly=new_salary,
                effective_from=effective_date.date(),
                change_reason=salary_reason,
                created_by_id=approved_by_id,
                notes=f"Role change: {from_role.value} -> {to_role.value}",
            )
            new_salary_id = salary.id

        # Create role change record
        role_change = RoleChange(
            employee_id=employee_id,
            chain_id=chain_id,
            change_type=change_type,
            from_role=from_role,
            to_role=to_role,
            from_branch_id=from_branch_id,
            to_branch_id=to_branch_id,
            new_salary_id=new_salary_id,
            effective_date=effective_date,
            reason=reason,
            approved_by_id=approved_by_id,
            created_at=datetime.utcnow(),
        )
        self.db.add(role_change)
        self.db.commit()
        self.db.refresh(role_change)
        return role_change

    def get_history(
        self,
        employee_id: int,
        chain_id: int
    ) -> list[RoleChange]:
        """Get role change history for an employee."""
        return self.db.query(RoleChange).filter(
            and_(
                RoleChange.employee_id == employee_id,
                RoleChange.chain_id == chain_id,
            )
        ).order_by(RoleChange.effective_date.desc()).all()

    def promote_employee(
        self,
        employee_id: int,
        chain_id: int,
        new_role: EmployeeRole,
        new_branch_id: Optional[int],
        approved_by_id: int,
        new_salary: Optional[Decimal] = None,
        reason: Optional[str] = None,
    ) -> tuple[Employee, RoleChange]:
        """Promote an employee to a new role."""
        employee = self.db.query(Employee).filter(
            and_(Employee.id == employee_id, Employee.chain_id == chain_id)
        ).first()

        if not employee:
            raise ValueError("Employee not found")

        from_role = employee.role
        from_branch_id = employee.branch_id

        # Validate it's actually a promotion
        if ROLE_HIERARCHY.get(new_role, 0) < ROLE_HIERARCHY.get(from_role, 0):
            raise ValueError("New role is not a promotion. Use demote instead.")

        # Update employee
        employee.role = new_role
        if new_branch_id is not None:
            employee.branch_id = new_branch_id
        self.db.add(employee)

        # Record the change
        role_change = self.record_role_change(
            employee_id=employee_id,
            chain_id=chain_id,
            from_role=from_role,
            to_role=new_role,
            from_branch_id=from_branch_id,
            to_branch_id=new_branch_id if new_branch_id is not None else from_branch_id,
            approved_by_id=approved_by_id,
            reason=reason,
            new_salary=new_salary,
        )

        self.db.commit()
        self.db.refresh(employee)
        return employee, role_change

    def _determine_change_type(
        self,
        from_role: EmployeeRole,
        to_role: EmployeeRole,
        from_branch_id: Optional[int],
        to_branch_id: Optional[int],
    ) -> RoleChangeType:
        """Determine the type of role change."""
        from_level = ROLE_HIERARCHY.get(from_role, 0)
        to_level = ROLE_HIERARCHY.get(to_role, 0)

        # If only branch changed, it's a transfer
        if from_role == to_role and from_branch_id != to_branch_id:
            return RoleChangeType.TRANSFER

        # Compare hierarchy levels
        if to_level > from_level:
            return RoleChangeType.PROMOTION
        elif to_level < from_level:
            return RoleChangeType.DEMOTION
        else:
            return RoleChangeType.LATERAL
