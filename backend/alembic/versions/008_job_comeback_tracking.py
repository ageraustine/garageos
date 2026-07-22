"""Job comeback tracking for Trust Score quality signal.

Revision ID: 008
Revises: 007_job_stage_completions
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add comeback tracking columns to jobs table
    op.add_column('jobs', sa.Column('is_comeback', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('jobs', sa.Column('original_job_id', sa.Integer(), nullable=True))

    # Add foreign key constraint
    op.create_foreign_key(
        'fk_jobs_original_job_id',
        'jobs', 'jobs',
        ['original_job_id'], ['id'],
        ondelete='SET NULL'
    )

    # Remove server default after column creation
    op.alter_column('jobs', 'is_comeback', server_default=None)


def downgrade() -> None:
    op.drop_constraint('fk_jobs_original_job_id', 'jobs', type_='foreignkey')
    op.drop_column('jobs', 'original_job_id')
    op.drop_column('jobs', 'is_comeback')
