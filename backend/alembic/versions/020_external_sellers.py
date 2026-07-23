"""Add support for external marketplace sellers.

Revision ID: 020
Revises: 019
Create Date: 2024-01-01

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers
revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add is_external_seller column to employees table."""
    op.add_column(
        "employees",
        sa.Column(
            "is_external_seller",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )
    op.create_index(
        "ix_employees_external_seller",
        "employees",
        ["is_external_seller"],
    )

    # Make chain_id nullable for external sellers
    op.alter_column(
        "employees",
        "chain_id",
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade() -> None:
    """Remove external seller support."""
    # First update any external sellers to have a chain_id (or delete them)
    # For safety, we'll just delete external sellers on downgrade
    connection = op.get_bind()
    connection.execute(
        sa.text("DELETE FROM employees WHERE is_external_seller = true")
    )

    op.drop_index("ix_employees_external_seller", table_name="employees")
    op.drop_column("employees", "is_external_seller")

    # Make chain_id non-nullable again
    op.alter_column(
        "employees",
        "chain_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
