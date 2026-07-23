"""Expense management service."""

from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List
from sqlmodel import Session, select, func

from app.models.expense import Expense, ExpenseCategory
from app.models.branch import Branch
from app.models.employee import Employee
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseUpdate,
    ExpenseResponse,
    ExpenseSummary,
    ExpenseAnalytics,
    CATEGORY_LABELS,
)
from app.core.exceptions import NotFoundError


class ExpenseService:
    """Expense CRUD and analytics."""

    def __init__(self, db: Session):
        self.db = db

    def create(
        self, chain_id: int, data: ExpenseCreate, created_by_id: int
    ) -> ExpenseResponse:
        """Create new expense."""
        expense = Expense(
            chain_id=chain_id,
            branch_id=data.branch_id,
            category=ExpenseCategory(data.category),
            amount=data.amount,
            description=data.description,
            vendor=data.vendor,
            expense_date=data.expense_date,
            job_id=data.job_id,
            is_recurring=data.is_recurring,
            notes=data.notes,
            created_by_id=created_by_id,
        )
        self.db.add(expense)
        self.db.commit()
        self.db.refresh(expense)
        return self._to_response(expense)

    def get_by_id(self, expense_id: int, chain_id: int) -> ExpenseResponse:
        """Get expense by ID."""
        expense = self.db.get(Expense, expense_id)
        if not expense or expense.chain_id != chain_id:
            raise NotFoundError(f"Expense {expense_id} not found")
        return self._to_response(expense)

    def list(
        self,
        chain_id: int,
        branch_id: Optional[int] = None,
        category: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> List[ExpenseResponse]:
        """List expenses with filters."""
        query = select(Expense).where(Expense.chain_id == chain_id)

        if branch_id is not None:
            query = query.where(Expense.branch_id == branch_id)
        if category:
            query = query.where(Expense.category == ExpenseCategory(category))
        if start_date:
            query = query.where(Expense.expense_date >= start_date)
        if end_date:
            query = query.where(Expense.expense_date <= end_date)

        query = query.order_by(Expense.expense_date.desc()).offset(offset).limit(limit)

        expenses = self.db.exec(query).all()
        return [self._to_response(e) for e in expenses]

    def update(
        self, expense_id: int, chain_id: int, data: ExpenseUpdate
    ) -> ExpenseResponse:
        """Update expense."""
        expense = self.db.get(Expense, expense_id)
        if not expense or expense.chain_id != chain_id:
            raise NotFoundError(f"Expense {expense_id} not found")

        if data.category is not None:
            expense.category = ExpenseCategory(data.category)
        if data.amount is not None:
            expense.amount = data.amount
        if data.description is not None:
            expense.description = data.description
        if data.vendor is not None:
            expense.vendor = data.vendor
        if data.expense_date is not None:
            expense.expense_date = data.expense_date
        if data.branch_id is not None:
            expense.branch_id = data.branch_id
        if data.job_id is not None:
            expense.job_id = data.job_id
        if data.is_recurring is not None:
            expense.is_recurring = data.is_recurring
        if data.notes is not None:
            expense.notes = data.notes

        expense.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(expense)
        return self._to_response(expense)

    def delete(self, expense_id: int, chain_id: int) -> None:
        """Delete expense."""
        expense = self.db.get(Expense, expense_id)
        if not expense or expense.chain_id != chain_id:
            raise NotFoundError(f"Expense {expense_id} not found")

        self.db.delete(expense)
        self.db.commit()

    def set_receipt_url(
        self, expense_id: int, chain_id: int, receipt_url: str
    ) -> ExpenseResponse:
        """Set receipt URL after upload."""
        expense = self.db.get(Expense, expense_id)
        if not expense or expense.chain_id != chain_id:
            raise NotFoundError(f"Expense {expense_id} not found")

        expense.receipt_url = receipt_url
        expense.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(expense)
        return self._to_response(expense)

    def get_analytics(
        self,
        chain_id: int,
        start_date: date,
        end_date: date,
        branch_id: Optional[int] = None,
    ) -> ExpenseAnalytics:
        """Get expense analytics for period."""
        # Base filters
        filters = [
            Expense.chain_id == chain_id,
            Expense.expense_date >= start_date,
            Expense.expense_date <= end_date,
        ]
        if branch_id is not None:
            filters.append(Expense.branch_id == branch_id)

        # Total expenses
        total = self.db.exec(
            select(func.sum(Expense.amount)).where(*filters)
        ).one() or Decimal("0")

        expense_count = self.db.exec(
            select(func.count(Expense.id)).where(*filters)
        ).one() or 0

        # By category
        category_results = self.db.exec(
            select(
                Expense.category,
                func.sum(Expense.amount).label("total"),
                func.count(Expense.id).label("count"),
            )
            .where(*filters)
            .group_by(Expense.category)
            .order_by(func.sum(Expense.amount).desc())
        ).all()

        by_category = []
        for cat, cat_total, cat_count in category_results:
            pct = (float(cat_total) / float(total) * 100) if total > 0 else 0
            by_category.append(ExpenseSummary(
                category=cat.value,
                category_label=CATEGORY_LABELS.get(cat.value, cat.value),
                total_amount=cat_total or Decimal("0"),
                count=cat_count or 0,
                percentage=round(pct, 1),
            ))

        # By branch
        branch_results = self.db.exec(
            select(
                Expense.branch_id,
                Branch.name,
                func.sum(Expense.amount).label("total"),
            )
            .outerjoin(Branch, Expense.branch_id == Branch.id)
            .where(*filters)
            .group_by(Expense.branch_id, Branch.name)
            .order_by(func.sum(Expense.amount).desc())
        ).all()

        by_branch = [
            {
                "branch_id": b_id,
                "branch_name": b_name or "Chain-wide",
                "total": float(b_total or 0),
            }
            for b_id, b_name, b_total in branch_results
        ]

        return ExpenseAnalytics(
            total_expenses=total,
            expense_count=expense_count,
            by_category=by_category,
            by_branch=by_branch,
        )

    def _to_response(self, expense: Expense) -> ExpenseResponse:
        """Convert model to response."""
        # Get branch name
        branch_name = None
        if expense.branch_id:
            branch = self.db.get(Branch, expense.branch_id)
            branch_name = branch.name if branch else None

        # Get creator name
        creator_name = None
        creator = self.db.get(Employee, expense.created_by_id)
        if creator:
            creator_name = creator.name

        return ExpenseResponse(
            id=expense.id,
            chain_id=expense.chain_id,
            branch_id=expense.branch_id,
            branch_name=branch_name,
            category=expense.category.value,
            category_label=CATEGORY_LABELS.get(expense.category.value, expense.category.value),
            amount=expense.amount,
            description=expense.description,
            vendor=expense.vendor,
            expense_date=expense.expense_date,
            receipt_url=expense.receipt_url,
            job_id=expense.job_id,
            is_recurring=expense.is_recurring,
            notes=expense.notes,
            created_by_id=expense.created_by_id,
            created_by_name=creator_name,
            created_at=expense.created_at,
            updated_at=expense.updated_at,
        )
