from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum


class EmployeeRole(str, Enum):
    """Staff roles within a garage chain."""

    ADVISOR = "advisor"  # Service advisor at branch
    MECHANIC = "mechanic"  # Technician at branch
    MANAGER = "manager"  # Branch manager
    HQ = "hq"  # Chain owner/admin (headquarters)


class Employee(SQLModel, table=True):
    """
    Staff member who can log into the system.

    For auth: phone (unique identifier) + pin_hash (bcrypt).
    HQ role users may have branch_id=None (they oversee all branches).
    """

    __tablename__ = "employees"

    id: Optional[int] = Field(default=None, primary_key=True)
    chain_id: int = Field(foreign_key="chains.id", index=True)
    branch_id: Optional[int] = Field(
        default=None,
        foreign_key="branches.id",
        index=True,
        description="Null for HQ users who oversee all branches",
    )
    role: EmployeeRole = Field(index=True)
    name: str = Field(max_length=100)
    phone: str = Field(
        unique=True,
        index=True,
        description="Phone number for login (E.164 format preferred)",
    )
    pin_hash: str = Field(description="bcrypt hash of 4-6 digit PIN")
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login_at: Optional[datetime] = Field(default=None)
