"""Add is_labor field to line_items for labor vs parts tracking

Revision ID: 015
Revises: 014
Create Date: 2024-01-01

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_labor boolean field with default False
    op.add_column(
        "line_items",
        sa.Column(
            "is_labor",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )


def downgrade() -> None:
    op.drop_column("line_items", "is_labor")
