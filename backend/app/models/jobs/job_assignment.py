"""Job assignment model - tracks which employees are assigned to jobs."""

from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional


class JobAssignment(SQLModel, table=True):
    """
    Many-to-many relationship between jobs and employees.
    Allows multiple employees to be assigned to a single job.
    """

    __tablename__ = "job_assignments"

    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="jobs.id", index=True)
    employee_id: int = Field(foreign_key="employees.id", index=True)
    assigned_at: datetime = Field(default_factory=datetime.utcnow)
    assigned_by_id: Optional[int] = Field(default=None, foreign_key="employees.id")
