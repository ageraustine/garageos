from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum
from app.models.employee import EmployeeRole


class RoleChangeType(str, Enum):
    """Type of role/position change."""
    PROMOTION = "promotion"
    DEMOTION = "demotion"
    LATERAL = "lateral"
    TRANSFER = "transfer"


class RoleChange(SQLModel, table=True):
    """
    Audit trail for employee role/branch changes.
    Created automatically when employee role or branch is updated.
    """
    __tablename__ = "role_changes"

    id: Optional[int] = Field(default=None, primary_key=True)
    employee_id: int = Field(foreign_key="employees.id", index=True)
    chain_id: int = Field(foreign_key="chains.id", index=True)

    change_type: RoleChangeType

    # Role change
    from_role: EmployeeRole
    to_role: EmployeeRole

    # Branch change (for transfers)
    from_branch_id: Optional[int] = Field(default=None, foreign_key="branches.id")
    to_branch_id: Optional[int] = Field(default=None, foreign_key="branches.id")

    # New salary (if changed with role)
    new_salary_id: Optional[int] = Field(default=None, foreign_key="employee_salaries.id")

    effective_date: datetime = Field(index=True)
    reason: Optional[str] = Field(default=None, max_length=500)

    approved_by_id: int = Field(foreign_key="employees.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
