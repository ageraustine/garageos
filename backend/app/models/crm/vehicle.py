from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional


class Vehicle(SQLModel, table=True):
    """
    Vehicle record anchored by plate number.
    History follows the plate across branches and ownership transfers.
    """

    __tablename__ = "vehicles"

    id: Optional[int] = Field(default=None, primary_key=True)
    plate: str = Field(
        unique=True,
        index=True,
        max_length=20,
        description="Unique license plate - permanent anchor",
    )
    make: str = Field(max_length=50)
    model: str = Field(max_length=50)
    year: Optional[int] = Field(default=None, ge=1900, le=2100)
    owner_id: Optional[int] = Field(
        default=None, foreign_key="customers.id", index=True
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
