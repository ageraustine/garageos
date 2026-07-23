"""Expense schemas for request/response validation."""

from pydantic import BaseModel, Field
from datetime import date, datetime
from typing import Optional, List
from decimal import Decimal


CATEGORY_LABELS = {
    "parts": "Parts & Supplies",
    "outsourced": "Outsourced Work",
    "utilities": "Utilities",
    "rent": "Rent",
    "equipment": "Equipment",
    "fuel": "Fuel",
    "marketing": "Marketing",
    "salaries": "Salaries",
    "maintenance": "Maintenance",
    "insurance": "Insurance",
    "taxes": "Taxes & Levies",
    "other": "Other",
}


class ExpenseCreate(BaseModel):
    """Create expense request."""

    category: str = Field(
        pattern=r"^(parts|outsourced|utilities|rent|equipment|fuel|marketing|salaries|maintenance|insurance|taxes|other)$"
    )
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    description: str = Field(min_length=1, max_length=500)
    vendor: Optional[str] = Field(default=None, max_length=200)
    expense_date: date
    branch_id: Optional[int] = None
    job_id: Optional[int] = None
    is_recurring: bool = False
    notes: Optional[str] = Field(default=None, max_length=1000)


class ExpenseUpdate(BaseModel):
    """Update expense request."""

    category: Optional[str] = Field(
        default=None,
        pattern=r"^(parts|outsourced|utilities|rent|equipment|fuel|marketing|salaries|maintenance|insurance|taxes|other)$"
    )
    amount: Optional[Decimal] = Field(default=None, gt=0, max_digits=12, decimal_places=2)
    description: Optional[str] = Field(default=None, min_length=1, max_length=500)
    vendor: Optional[str] = Field(default=None, max_length=200)
    expense_date: Optional[date] = None
    branch_id: Optional[int] = None
    job_id: Optional[int] = None
    is_recurring: Optional[bool] = None
    notes: Optional[str] = Field(default=None, max_length=1000)


class ExpenseResponse(BaseModel):
    """Expense response."""

    id: int
    chain_id: int
    branch_id: Optional[int]
    branch_name: Optional[str] = None
    category: str
    category_label: str
    amount: Decimal
    description: str
    vendor: Optional[str]
    expense_date: date
    receipt_url: Optional[str]
    job_id: Optional[int]
    is_recurring: bool
    notes: Optional[str]
    created_by_id: int
    created_by_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime]


class ExpenseSummary(BaseModel):
    """Expense summary by category."""

    category: str
    category_label: str
    total_amount: Decimal
    count: int
    percentage: float


class ExpenseAnalytics(BaseModel):
    """Expense analytics for dashboard."""

    total_expenses: Decimal
    expense_count: int
    by_category: List[ExpenseSummary]
    by_branch: List[dict]  # branch_id, branch_name, total


class ReceiptUploadResponse(BaseModel):
    """Receipt upload URL response."""

    upload_url: str
    object_key: str
