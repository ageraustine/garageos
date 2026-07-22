from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Enum as SAEnum
from datetime import datetime
from typing import Optional
from decimal import Decimal
from enum import Enum


class LineItemKind(str, Enum):
    """Line item categorization for customer UX."""

    CRITICAL = "critical"
    OPTIONAL = "optional"


class LineItem(SQLModel, table=True):
    """
    Individual line on an estimate.
    Optional items MUST have justification_media_id (enforced at service layer).
    """

    __tablename__ = "line_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    estimate_id: int = Field(foreign_key="estimates.id", index=True)
    kind: LineItemKind = Field(
        default=LineItemKind.CRITICAL,
        sa_column=Column(SAEnum(LineItemKind, values_callable=lambda x: [e.value for e in x]), nullable=False)
    )
    label: str = Field(max_length=200)
    price: Decimal = Field(max_digits=10, decimal_places=2)
    justification_media_id: Optional[int] = Field(
        default=None,
        foreign_key="media_assets.id",
        description="Required for optional items",
    )
    voice_source_lang: Optional[str] = Field(default=None, max_length=10)
    parsed_from_voice: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
