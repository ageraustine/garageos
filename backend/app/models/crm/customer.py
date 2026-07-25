from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from typing import Optional


class Customer(SQLModel, table=True):
    """
    Customer identity - tied to phone (WhatsApp/M-Pesa).
    No password; authenticated via magic_link_token on jobs.
    """

    __tablename__ = "customers"

    id: Optional[int] = Field(default=None, primary_key=True)
    chain_id: int = Field(foreign_key="chains.id", index=True)
    phone: str = Field(
        index=True,
        max_length=20,
        description="WhatsApp/M-Pesa identity (E.164 format)",
    )
    name: str = Field(max_length=100)
    email: Optional[str] = Field(default=None, max_length=200)
    address: Optional[str] = Field(default=None, max_length=500)
    tags: Optional[list] = Field(
        default=None,
        sa_column=Column(JSONB),
        description="Custom tags for segmentation (e.g., VIP, fleet)",
    )
    consent_flags: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSONB),
        description="Governs cross-branch vault visibility",
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
