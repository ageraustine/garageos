from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from typing import Optional


class Chain(SQLModel, table=True):
    """
    Top-level tenant organization (garage chain).

    The 'name' field is the globally unique slug (like @username).
    Example: 'autofix-kenya', 'quickserv-nairobi'
    """

    __tablename__ = "chains"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(
        unique=True,
        index=True,
        min_length=3,
        max_length=30,
        description="Unique URL-safe slug (lowercase, alphanumeric, hyphens)",
    )
    display_name: str = Field(
        max_length=100,
        description="Human-readable garage name shown in UI",
    )
    currency: str = Field(
        default="KES",
        max_length=10,
        description="Currency code (e.g., KES, USD, TZS, UGX)",
    )
    branding: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSONB),
        description="Logo URL, colors for white-label theming",
    )
    commission_formula: Optional[dict] = Field(
        default=None,
        sa_column=Column(JSONB),
        description="Custom commission calculation rules",
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
