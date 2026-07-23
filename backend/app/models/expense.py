"""Expense model for tracking business costs."""

from sqlmodel import SQLModel, Field
from datetime import date, datetime
from typing import Optional
from decimal import Decimal
from enum import Enum


class ExpenseCategory(str, Enum):
    """Categories of business expenses (costs going OUT, not revenue from customers)."""

    PARTS = "parts"  # Auto parts, supplies purchased
    OUTSOURCED = "outsourced"  # Subcontracted/external labor
    UTILITIES = "utilities"  # Electricity, water, internet
    RENT = "rent"  # Premises rent
    EQUIPMENT = "equipment"  # Tools, machines, equipment
    FUEL = "fuel"  # Fuel for service vehicles
    MARKETING = "marketing"  # Advertising, promotions
    SALARIES = "salaries"  # Employee wages (when not via payroll)
    MAINTENANCE = "maintenance"  # Building/equipment maintenance
    INSURANCE = "insurance"  # Business insurance
    TAXES = "taxes"  # Government taxes, levies
    OTHER = "other"  # Miscellaneous


class Expense(SQLModel, table=True):
    """Track business expenses for profit/loss analysis."""

    __tablename__ = "expenses"

    id: Optional[int] = Field(default=None, primary_key=True)
    chain_id: int = Field(foreign_key="chains.id", index=True)
    branch_id: Optional[int] = Field(
        default=None,
        foreign_key="branches.id",
        index=True,
        description="Null for chain-wide expenses",
    )
    category: ExpenseCategory = Field(index=True)
    amount: Decimal = Field(max_digits=12, decimal_places=2)
    description: str = Field(max_length=500)
    vendor: Optional[str] = Field(default=None, max_length=200)
    expense_date: date = Field(index=True)
    receipt_url: Optional[str] = Field(default=None, max_length=500)
    job_id: Optional[int] = Field(
        default=None,
        foreign_key="jobs.id",
        index=True,
        description="If expense is linked to a specific job",
    )
    is_recurring: bool = Field(default=False)
    notes: Optional[str] = Field(default=None, max_length=1000)
    created_by_id: int = Field(foreign_key="employees.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)
