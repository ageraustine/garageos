"""Add email verification fields to employees

Revision ID: 022
Revises: 021
Create Date: 2026-07-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "022"
down_revision: Union[str, None] = "021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add email verification fields to employees table
    op.add_column(
        "employees",
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "employees",
        sa.Column("email_verification_token", sa.String(100), nullable=True),
    )
    op.add_column(
        "employees",
        sa.Column("email_verification_sent_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Create index for faster token lookups
    op.create_index(
        "ix_employees_email_verification_token",
        "employees",
        ["email_verification_token"],
    )

    # Mark existing employees as verified (they signed up before this feature)
    op.execute("UPDATE employees SET email_verified = true WHERE email IS NOT NULL")


def downgrade() -> None:
    op.drop_index("ix_employees_email_verification_token", "employees")
    op.drop_column("employees", "email_verification_sent_at")
    op.drop_column("employees", "email_verification_token")
    op.drop_column("employees", "email_verified")
