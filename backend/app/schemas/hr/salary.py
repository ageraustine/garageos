from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional
from decimal import Decimal
from app.models.hr.employee_salary import SalaryChangeReason


class SalaryCreate(BaseModel):
    """Request to set/update employee salary."""
    gross_monthly: Decimal = Field(..., gt=0, max_digits=12, decimal_places=2)
    effective_from: date
    change_reason: SalaryChangeReason
    notes: Optional[str] = Field(None, max_length=500)


class SalaryResponse(BaseModel):
    """Salary record response."""
    id: int
    employee_id: int
    gross_monthly: Decimal
    effective_from: date
    effective_to: Optional[date]
    change_reason: SalaryChangeReason
    notes: Optional[str]
    created_by_id: int
    created_by_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CurrentSalaryResponse(BaseModel):
    """Current salary with employee info."""
    employee_id: int
    employee_name: str
    employee_role: str
    branch_name: Optional[str]
    gross_monthly: Decimal
    effective_from: date
    change_reason: SalaryChangeReason
    salary_id: int


class SalaryHistoryResponse(BaseModel):
    """Salary history list."""
    employee_id: int
    employee_name: str
    history: list[SalaryResponse]
