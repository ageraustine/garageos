from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
from enum import Enum
import secrets


class JobStatus(str, Enum):
    """Job lifecycle states."""

    INTAKE = "intake"
    DIAGNOSIS = "diagnosis"
    WORKING = "working"
    WASHING = "washing"
    READY = "ready"
    PAID = "paid"


def generate_magic_token() -> str:
    """Generate unguessable 32-char token for customer links."""
    return secrets.token_urlsafe(24)


class Job(SQLModel, table=True):
    """
    Central unit of work - the job ticket.
    magic_link_token is the customer's only credential.
    """

    __tablename__ = "jobs"

    id: Optional[int] = Field(default=None, primary_key=True)
    vehicle_id: int = Field(foreign_key="vehicles.id", index=True)
    branch_id: int = Field(foreign_key="branches.id", index=True)
    advisor_id: int = Field(foreign_key="employees.id", index=True)
    assigned_mechanic_id: Optional[int] = Field(
        default=None, foreign_key="employees.id", index=True
    )
    customer_name: Optional[str] = Field(default=None, max_length=100)
    customer_phone: Optional[str] = Field(default=None, max_length=20, index=True)
    status: JobStatus = Field(default=JobStatus.INTAKE, index=True)
    intake_at: datetime = Field(default_factory=datetime.utcnow)
    promised_ready_at: Optional[datetime] = Field(default=None)
    actual_ready_at: Optional[datetime] = Field(default=None)
    magic_link_token: str = Field(
        default_factory=generate_magic_token,
        unique=True,
        index=True,
        max_length=50,
        description="Opaque, unguessable customer credential",
    )
    # Comeback tracking for Trust Score return rate signal
    is_comeback: bool = Field(
        default=False, description="True if this job is a return for same fault"
    )
    original_job_id: Optional[int] = Field(
        default=None,
        foreign_key="jobs.id",
        description="Links to original job if this is a comeback",
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
