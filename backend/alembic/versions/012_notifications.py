"""Notifications table for SMS/WhatsApp tracking.

Revision ID: 012
Revises: 011
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '012'
down_revision = '011'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'notifications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('job_id', sa.Integer(), nullable=False),
        sa.Column('chain_id', sa.Integer(), nullable=False),
        sa.Column('phone', sa.String(20), nullable=False),
        sa.Column('customer_name', sa.String(100), nullable=True),
        sa.Column('notification_type', sa.String(30), nullable=False),
        sa.Column('channel', sa.String(20), nullable=False, server_default='sms'),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('external_id', sa.String(100), nullable=True),
        sa.Column('cost', sa.String(20), nullable=True),
        sa.Column('error_message', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chain_id'], ['chains.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_notifications_job_id', 'notifications', ['job_id'])
    op.create_index('ix_notifications_chain_id', 'notifications', ['chain_id'])
    op.create_index('ix_notifications_type', 'notifications', ['notification_type'])
    op.create_index('ix_notifications_status', 'notifications', ['status'])


def downgrade() -> None:
    op.drop_table('notifications')
