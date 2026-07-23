"""Add expenses table

Revision ID: 014
Revises: 013
Create Date: 2024-01-01

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "expenses",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("chain_id", sa.Integer(), nullable=False),
        sa.Column("branch_id", sa.Integer(), nullable=True),
        sa.Column("category", sa.String(length=50), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=False),
        sa.Column("vendor", sa.String(length=200), nullable=True),
        sa.Column("expense_date", sa.Date(), nullable=False),
        sa.Column("receipt_url", sa.String(length=500), nullable=True),
        sa.Column("job_id", sa.Integer(), nullable=True),
        sa.Column("is_recurring", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("notes", sa.String(length=1000), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["chain_id"], ["chains.id"]),
        sa.ForeignKeyConstraint(["branch_id"], ["branches.id"]),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"]),
        sa.ForeignKeyConstraint(["created_by_id"], ["employees.id"]),
    )
    op.create_index("ix_expenses_chain_id", "expenses", ["chain_id"])
    op.create_index("ix_expenses_branch_id", "expenses", ["branch_id"])
    op.create_index("ix_expenses_category", "expenses", ["category"])
    op.create_index("ix_expenses_expense_date", "expenses", ["expense_date"])
    op.create_index("ix_expenses_job_id", "expenses", ["job_id"])


def downgrade() -> None:
    op.drop_index("ix_expenses_job_id", table_name="expenses")
    op.drop_index("ix_expenses_expense_date", table_name="expenses")
    op.drop_index("ix_expenses_category", table_name="expenses")
    op.drop_index("ix_expenses_branch_id", table_name="expenses")
    op.drop_index("ix_expenses_chain_id", table_name="expenses")
    op.drop_table("expenses")
