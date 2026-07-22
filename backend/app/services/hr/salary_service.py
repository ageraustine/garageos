from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import date, datetime
from typing import Optional
from decimal import Decimal

from app.models.hr.employee_salary import EmployeeSalary, SalaryChangeReason
from app.models.employee import Employee


class SalaryService:
    """Salary management with history tracking."""

    def __init__(self, db: Session):
        self.db = db

    def get_current_salary(self, employee_id: int, chain_id: int) -> Optional[EmployeeSalary]:
        """Get employee's current salary (effective_to IS NULL)."""
        return self.db.query(EmployeeSalary).filter(
            and_(
                EmployeeSalary.employee_id == employee_id,
                EmployeeSalary.chain_id == chain_id,
                EmployeeSalary.effective_to.is_(None)
            )
        ).first()

    def get_salary_history(self, employee_id: int, chain_id: int) -> list[EmployeeSalary]:
        """Get full salary history ordered by effective_from DESC."""
        return self.db.query(EmployeeSalary).filter(
            and_(
                EmployeeSalary.employee_id == employee_id,
                EmployeeSalary.chain_id == chain_id
            )
        ).order_by(EmployeeSalary.effective_from.desc()).all()

    def set_salary(
        self,
        employee_id: int,
        chain_id: int,
        gross_monthly: Decimal,
        effective_from: date,
        change_reason: SalaryChangeReason,
        created_by_id: int,
        notes: Optional[str] = None,
    ) -> EmployeeSalary:
        """
        Set new salary, closing any existing current salary record.
        Creates audit trail automatically.
        """
        # Verify employee exists and belongs to chain
        employee = self.db.query(Employee).filter(
            and_(Employee.id == employee_id, Employee.chain_id == chain_id)
        ).first()
        if not employee:
            raise ValueError("Employee not found in this chain")

        # Close current salary if exists
        current_salary = self.get_current_salary(employee_id, chain_id)
        if current_salary:
            # Set effective_to to day before new salary starts
            if effective_from <= current_salary.effective_from:
                raise ValueError("New salary effective date must be after current salary date")
            current_salary.effective_to = effective_from
            self.db.add(current_salary)

        # Create new salary record
        new_salary = EmployeeSalary(
            employee_id=employee_id,
            chain_id=chain_id,
            gross_monthly=gross_monthly,
            effective_from=effective_from,
            effective_to=None,
            change_reason=change_reason,
            notes=notes,
            created_by_id=created_by_id,
            created_at=datetime.utcnow(),
        )
        self.db.add(new_salary)
        self.db.commit()
        self.db.refresh(new_salary)

        return new_salary

    def get_salary_at_date(
        self, employee_id: int, chain_id: int, target_date: date
    ) -> Optional[EmployeeSalary]:
        """Get salary that was effective at a specific date."""
        return self.db.query(EmployeeSalary).filter(
            and_(
                EmployeeSalary.employee_id == employee_id,
                EmployeeSalary.chain_id == chain_id,
                EmployeeSalary.effective_from <= target_date,
                (
                    EmployeeSalary.effective_to.is_(None) |
                    (EmployeeSalary.effective_to > target_date)
                )
            )
        ).first()

    def get_employees_with_salaries(self, chain_id: int, branch_id: Optional[int] = None) -> list[dict]:
        """Get all employees with their current salaries."""
        query = self.db.query(Employee, EmployeeSalary).outerjoin(
            EmployeeSalary,
            and_(
                Employee.id == EmployeeSalary.employee_id,
                EmployeeSalary.effective_to.is_(None)
            )
        ).filter(
            and_(
                Employee.chain_id == chain_id,
                Employee.is_active == True
            )
        )

        if branch_id:
            query = query.filter(Employee.branch_id == branch_id)

        results = query.all()
        return [
            {
                "employee": emp,
                "current_salary": salary
            }
            for emp, salary in results
        ]
