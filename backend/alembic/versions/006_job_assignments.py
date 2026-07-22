"""Add job_assignments table

Revision ID: 006
Revises: 005
Create Date: 2024-01-16
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'job_assignments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('job_id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('assigned_at', sa.DateTime(), nullable=False),
        sa.Column('assigned_by_id', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ),
        sa.ForeignKeyConstraint(['assigned_by_id'], ['employees.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_job_assignments_job_id', 'job_assignments', ['job_id'])
    op.create_index('ix_job_assignments_employee_id', 'job_assignments', ['employee_id'])


def downgrade() -> None:
    op.drop_index('ix_job_assignments_employee_id')
    op.drop_index('ix_job_assignments_job_id')
    op.drop_table('job_assignments')
