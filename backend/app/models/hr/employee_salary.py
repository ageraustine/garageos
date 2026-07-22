from sqlmodel import SQLModel, Field
from datetime import datetime, date
from typing import Optional
from decimal import Decimal
from enum import Enum


class SalaryChangeReason(str, Enum):
    """Reason for salary change."""
    INITIAL = "initial"
    PROMOTION = "promotion"
    ANNUAL_REVIEW = "annual_review"
    ADJUSTMENT = "adjustment"
    DEMOTION = "demotion"


class EmployeeSalary(SQLModel, table=True):
    """
    Salary history for employees.
    Tracks gross salary with effective dates for audit trail.
    Only one record per employee can be current (effective_to IS NULL).
    """
    __tablename__ = "employee_salaries"

    id: Optional[int] = Field(default=None, primary_key=True)
    employee_id: int = Field(foreign_key="employees.id", index=True)
    chain_id: int = Field(foreign_key="chains.id", index=True)

    gross_monthly: Decimal = Field(max_digits=12, decimal_places=2)
    effective_from: date = Field(index=True)
    effective_to: Optional[date] = Field(default=None, index=True)

    change_reason: SalaryChangeReason
    notes: Optional[str] = Field(default=None, max_length=500)

    created_by_id: int = Field(foreign_key="employees.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
