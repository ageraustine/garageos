from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from app.models.hr.role_change import RoleChangeType
from app.models.employee import EmployeeRole


class RoleChangeResponse(BaseModel):
    """Role change record response."""
    id: int
    employee_id: int
    chain_id: int
    change_type: RoleChangeType
    from_role: EmployeeRole
    to_role: EmployeeRole
    from_branch_id: Optional[int]
    from_branch_name: Optional[str] = None
    to_branch_id: Optional[int]
    to_branch_name: Optional[str] = None
    new_salary_id: Optional[int]
    effective_date: datetime
    reason: Optional[str]
    approved_by_id: int
    approved_by_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RoleChangeHistoryResponse(BaseModel):
    """Role change history for an employee."""
    employee_id: int
    employee_name: str
    current_role: EmployeeRole
    current_branch_name: Optional[str]
    history: list[RoleChangeResponse]


class PromotionRequest(BaseModel):
    """Request to promote/change employee role."""
    employee_id: int
    new_role: EmployeeRole
    new_branch_id: Optional[int] = None
    new_salary: Optional[float] = Field(None, gt=0)
    reason: Optional[str] = Field(None, max_length=500)
    effective_date: Optional[datetime] = None  # Default: now
