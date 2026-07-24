"""Add password reset fields to employees

Revision ID: 023
Revises: 022
Create Date: 2026-07-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "023"
down_revision: Union[str, None] = "022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add password reset fields to employees table
    op.add_column(
        "employees",
        sa.Column("password_reset_token", sa.String(100), nullable=True),
    )
    op.add_column(
        "employees",
        sa.Column("password_reset_sent_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Create index for faster token lookups
    op.create_index(
        "ix_employees_password_reset_token",
        "employees",
        ["password_reset_token"],
    )


def downgrade() -> None:
    op.drop_index("ix_employees_password_reset_token", "employees")
    op.drop_column("employees", "password_reset_sent_at")
    op.drop_column("employees", "password_reset_token")
