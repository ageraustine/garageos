from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional
from decimal import Decimal


class Estimate(SQLModel, table=True):
    """
    Immutable estimate snapshot. Edits create new version.
    Per invariant #5: post-approval changes require fresh approval.
    """

    __tablename__ = "estimates"

    id: Optional[int] = Field(default=None, primary_key=True)
    job_id: int = Field(foreign_key="jobs.id", index=True)
    version: int = Field(default=1, description="New version per re-approval")
    approved_at: Optional[datetime] = Field(default=None)
    approved_ip: Optional[str] = Field(default=None, max_length=45)
    total_approved: Optional[Decimal] = Field(
        default=None,
        max_digits=12,
        decimal_places=2,
        description="Locked once approved",
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
