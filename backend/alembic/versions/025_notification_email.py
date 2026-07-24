"""Add email field to notifications and make phone nullable

Revision ID: 025
Revises: 024
Create Date: 2026-07-24
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "025"
down_revision: Union[str, None] = "024"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add email field to notifications table
    op.add_column(
        "notifications",
        sa.Column("email", sa.String(200), nullable=True),
    )

    # Make phone field nullable (it was required before)
    op.alter_column(
        "notifications",
        "phone",
        existing_type=sa.String(20),
        nullable=True,
    )


def downgrade() -> None:
    # Make phone required again
    op.alter_column(
        "notifications",
        "phone",
        existing_type=sa.String(20),
        nullable=False,
    )

    # Remove email field
    op.drop_column("notifications", "email")
