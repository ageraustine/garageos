"""Add customer_email field to jobs

Revision ID: 024
Revises: 023
Create Date: 2026-07-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "024"
down_revision: Union[str, None] = "023"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add customer_email field to jobs table
    op.add_column(
        "jobs",
        sa.Column("customer_email", sa.String(200), nullable=True),
    )

    # Create index for faster email lookups
    op.create_index(
        "ix_jobs_customer_email",
        "jobs",
        ["customer_email"],
    )


def downgrade() -> None:
    op.drop_index("ix_jobs_customer_email", "jobs")
    op.drop_column("jobs", "customer_email")
