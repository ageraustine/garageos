"""HR module tables - salary, payroll, attendance, leave, reviews.

Revision ID: 010
Revises: 009
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # employee_salaries - salary history with effective dates
    op.create_table(
        'employee_salaries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('chain_id', sa.Integer(), nullable=False),
        sa.Column('gross_monthly', sa.Numeric(12, 2), nullable=False),
        sa.Column('effective_from', sa.Date(), nullable=False),
        sa.Column('effective_to', sa.Date(), nullable=True),
        sa.Column('change_reason', sa.String(50), nullable=False),
        sa.Column('notes', sa.String(500), nullable=True),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chain_id'], ['chains.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_id'], ['employees.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_employee_salaries_employee_id', 'employee_salaries', ['employee_id'])
    op.create_index('ix_employee_salaries_chain_id', 'employee_salaries', ['chain_id'])
    op.create_index('ix_employee_salaries_effective_from', 'employee_salaries', ['effective_from'])
    op.create_index('ix_employee_salaries_effective_to', 'employee_salaries', ['effective_to'])

    # payroll_periods - monthly payroll batches
    op.create_table(
        'payroll_periods',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('chain_id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=True),
        sa.Column('period_year', sa.Integer(), nullable=False),
        sa.Column('period_month', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(30), nullable=False, server_default='draft'),
        sa.Column('total_gross', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('total_net', sa.Numeric(14, 2), nullable=False, server_default='0'),
        sa.Column('employee_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('approved_by_id', sa.Integer(), nullable=True),
        sa.Column('approved_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['chain_id'], ['chains.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by_id'], ['employees.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['approved_by_id'], ['employees.id'], ondelete='SET NULL'),
        sa.UniqueConstraint('chain_id', 'period_year', 'period_month', 'branch_id', name='uq_payroll_period'),
    )
    op.create_index('ix_payroll_periods_chain_id', 'payroll_periods', ['chain_id'])
    op.create_index('ix_payroll_periods_status', 'payroll_periods', ['status'])
    op.create_index('ix_payroll_periods_year_month', 'payroll_periods', ['period_year', 'period_month'])

    # payroll_items - individual employee payments per period
    op.create_table(
        'payroll_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('payroll_period_id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('gross_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('deductions', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('net_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('method', sa.String(20), nullable=False, server_default='mpesa_b2c'),
        sa.Column('phone_number', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('daraja_conversation_id', sa.String(100), nullable=True),
        sa.Column('daraja_originator_conversation_id', sa.String(100), nullable=True),
        sa.Column('mpesa_receipt', sa.String(50), nullable=True),
        sa.Column('manual_reference', sa.String(100), nullable=True),
        sa.Column('manual_paid_at', sa.DateTime(), nullable=True),
        sa.Column('manual_recorded_by_id', sa.Integer(), nullable=True),
        sa.Column('failure_reason', sa.String(500), nullable=True),
        sa.Column('retry_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('idempotency_key', sa.String(100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['payroll_period_id'], ['payroll_periods.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['manual_recorded_by_id'], ['employees.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_payroll_items_period', 'payroll_items', ['payroll_period_id'])
    op.create_index('ix_payroll_items_employee', 'payroll_items', ['employee_id'])
    op.create_index('ix_payroll_items_status', 'payroll_items', ['status'])
    op.create_index('ix_payroll_items_conversation_id', 'payroll_items', ['daraja_conversation_id'])
    op.create_index('ix_payroll_items_idempotency', 'payroll_items', ['idempotency_key'], unique=True)

    # role_changes - promotion/demotion/transfer audit trail
    op.create_table(
        'role_changes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('chain_id', sa.Integer(), nullable=False),
        sa.Column('change_type', sa.String(20), nullable=False),
        sa.Column('from_role', sa.String(20), nullable=False),
        sa.Column('to_role', sa.String(20), nullable=False),
        sa.Column('from_branch_id', sa.Integer(), nullable=True),
        sa.Column('to_branch_id', sa.Integer(), nullable=True),
        sa.Column('new_salary_id', sa.Integer(), nullable=True),
        sa.Column('effective_date', sa.DateTime(), nullable=False),
        sa.Column('reason', sa.String(500), nullable=True),
        sa.Column('approved_by_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chain_id'], ['chains.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['from_branch_id'], ['branches.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['to_branch_id'], ['branches.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['new_salary_id'], ['employee_salaries.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['approved_by_id'], ['employees.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_role_changes_employee', 'role_changes', ['employee_id'])
    op.create_index('ix_role_changes_chain', 'role_changes', ['chain_id'])
    op.create_index('ix_role_changes_effective', 'role_changes', ['effective_date'])

    # attendance_records - daily clock in/out
    op.create_table(
        'attendance_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('branch_id', sa.Integer(), nullable=False),
        sa.Column('attendance_date', sa.Date(), nullable=False),
        sa.Column('clock_in', sa.DateTime(), nullable=True),
        sa.Column('clock_out', sa.DateTime(), nullable=True),
        sa.Column('total_minutes', sa.Integer(), nullable=True),
        sa.Column('overtime_minutes', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('clock_in_lat', sa.Float(), nullable=True),
        sa.Column('clock_in_lng', sa.Float(), nullable=True),
        sa.Column('clock_out_lat', sa.Float(), nullable=True),
        sa.Column('clock_out_lng', sa.Float(), nullable=True),
        sa.Column('notes', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('employee_id', 'attendance_date', name='uq_attendance_employee_date'),
    )
    op.create_index('ix_attendance_employee', 'attendance_records', ['employee_id'])
    op.create_index('ix_attendance_date', 'attendance_records', ['attendance_date'])
    op.create_index('ix_attendance_branch', 'attendance_records', ['branch_id'])

    # leave_requests - leave/vacation management
    op.create_table(
        'leave_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('chain_id', sa.Integer(), nullable=False),
        sa.Column('leave_type', sa.String(30), nullable=False),
        sa.Column('start_date', sa.Date(), nullable=False),
        sa.Column('end_date', sa.Date(), nullable=False),
        sa.Column('days_requested', sa.Integer(), nullable=False),
        sa.Column('reason', sa.String(500), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('reviewed_by_id', sa.Integer(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('rejection_reason', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chain_id'], ['chains.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewed_by_id'], ['employees.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_leave_employee', 'leave_requests', ['employee_id'])
    op.create_index('ix_leave_chain', 'leave_requests', ['chain_id'])
    op.create_index('ix_leave_start_date', 'leave_requests', ['start_date'])
    op.create_index('ix_leave_status', 'leave_requests', ['status'])

    # performance_reviews - periodic reviews with ratings
    op.create_table(
        'performance_reviews',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('chain_id', sa.Integer(), nullable=False),
        sa.Column('period_type', sa.String(20), nullable=False),
        sa.Column('period_start', sa.Date(), nullable=False),
        sa.Column('period_end', sa.Date(), nullable=False),
        sa.Column('rating_quality', sa.Integer(), nullable=True),
        sa.Column('rating_productivity', sa.Integer(), nullable=True),
        sa.Column('rating_teamwork', sa.Integer(), nullable=True),
        sa.Column('rating_punctuality', sa.Integer(), nullable=True),
        sa.Column('rating_customer_service', sa.Integer(), nullable=True),
        sa.Column('overall_rating', sa.Float(), nullable=True),
        sa.Column('strengths', sa.Text(), nullable=True),
        sa.Column('areas_for_improvement', sa.Text(), nullable=True),
        sa.Column('goals_next_period', sa.Text(), nullable=True),
        sa.Column('reviewer_comments', sa.Text(), nullable=True),
        sa.Column('employee_comments', sa.Text(), nullable=True),
        sa.Column('trust_score_at_review', sa.Float(), nullable=True),
        sa.Column('jobs_completed', sa.Integer(), nullable=True),
        sa.Column('is_draft', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('reviewer_id', sa.Integer(), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('acknowledged_by_employee', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('acknowledged_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chain_id'], ['chains.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['reviewer_id'], ['employees.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_reviews_employee', 'performance_reviews', ['employee_id'])
    op.create_index('ix_reviews_chain', 'performance_reviews', ['chain_id'])
    op.create_index('ix_reviews_period_end', 'performance_reviews', ['period_end'])


def downgrade() -> None:
    op.drop_table('performance_reviews')
    op.drop_table('leave_requests')
    op.drop_table('attendance_records')
    op.drop_table('role_changes')
    op.drop_table('payroll_items')
    op.drop_table('payroll_periods')
    op.drop_table('employee_salaries')
