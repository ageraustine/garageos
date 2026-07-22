"""Add currency to chains

Revision ID: 005
Revises: 004
Create Date: 2024-01-15
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('chains', sa.Column('currency', sa.String(10), nullable=False, server_default='KES'))


def downgrade() -> None:
    op.drop_column('chains', 'currency')
