from sqlmodel import SQLModel, Field
from datetime import datetime
from typing import Optional


class CustomerNote(SQLModel, table=True):
    """
    Staff notes on customers - preferences, reminders, interactions.
    Useful for personalized service and follow-ups.
    """

    __tablename__ = "customer_notes"

    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: int = Field(foreign_key="customers.id", index=True)
    created_by_id: int = Field(foreign_key="employees.id", index=True)
    content: str = Field(max_length=1000)
    is_pinned: bool = Field(default=False, description="Pinned notes show at top")
    created_at: datetime = Field(default_factory=datetime.utcnow)
