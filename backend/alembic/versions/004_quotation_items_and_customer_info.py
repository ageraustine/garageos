"""Add quotation items and customer info to jobs

Revision ID: 004
Revises: 003
Create Date: 2024-01-15
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add customer info columns to jobs table
    op.add_column('jobs', sa.Column('customer_name', sa.String(100), nullable=True))
    op.add_column('jobs', sa.Column('customer_phone', sa.String(20), nullable=True))
    op.create_index('ix_jobs_customer_phone', 'jobs', ['customer_phone'])

    # Create service_quotation_items table
    op.create_table(
        'service_quotation_items',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('service_id', sa.Integer(), sa.ForeignKey('services.id'), nullable=False, index=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('is_labor', sa.Boolean(), default=False, nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    # Drop service_quotation_items table
    op.drop_table('service_quotation_items')

    # Remove customer info columns from jobs
    op.drop_index('ix_jobs_customer_phone', table_name='jobs')
    op.drop_column('jobs', 'customer_phone')
    op.drop_column('jobs', 'customer_name')
