"""Add job_stage_completions table for checkbox-style stage tracking

Revision ID: 007
Revises: 006
Create Date: 2024-01-17
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'job_stage_completions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('job_service_id', sa.Integer(), nullable=False),
        sa.Column('stage_id', sa.Integer(), nullable=False),
        sa.Column('completed_at', sa.DateTime(), nullable=False),
        sa.Column('completed_by_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['job_service_id'], ['job_services.id'], ),
        sa.ForeignKeyConstraint(['stage_id'], ['service_stages.id'], ),
        sa.ForeignKeyConstraint(['completed_by_id'], ['employees.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_job_stage_completions_job_service_id', 'job_stage_completions', ['job_service_id'])
    op.create_index(
        'ix_job_stage_completions_unique',
        'job_stage_completions',
        ['job_service_id', 'stage_id'],
        unique=True
    )


def downgrade() -> None:
    op.drop_index('ix_job_stage_completions_unique')
    op.drop_index('ix_job_stage_completions_job_service_id')
    op.drop_table('job_stage_completions')
