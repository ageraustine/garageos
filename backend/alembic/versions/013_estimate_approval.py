"""Add estimate approval and payment tracking fields

Revision ID: 013
Revises: 012
Create Date: 2024-01-01

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add approved_by_id foreign key to employees
    op.add_column(
        "estimates",
        sa.Column("approved_by_id", sa.Integer(), nullable=True),
    )
    op.create_foreign_key(
        "fk_estimates_approved_by",
        "estimates",
        "employees",
        ["approved_by_id"],
        ["id"],
    )
    op.create_index("ix_estimates_approved_by_id", "estimates", ["approved_by_id"])

    # Add approval_type enum
    op.add_column(
        "estimates",
        sa.Column(
            "approval_type",
            sa.String(length=20),
            nullable=True,
        ),
    )

    # Add paid_amount with default 0
    op.add_column(
        "estimates",
        sa.Column(
            "paid_amount",
            sa.Numeric(precision=12, scale=2),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    op.drop_column("estimates", "paid_amount")
    op.drop_column("estimates", "approval_type")
    op.drop_index("ix_estimates_approved_by_id", table_name="estimates")
    op.drop_constraint("fk_estimates_approved_by", "estimates", type_="foreignkey")
    op.drop_column("estimates", "approved_by_id")
