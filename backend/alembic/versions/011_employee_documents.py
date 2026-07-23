"""Employee documents and profile enhancements.

Revision ID: 011
Revises: 010
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to employees table
    op.add_column('employees', sa.Column('email', sa.String(255), nullable=True))
    op.add_column('employees', sa.Column('id_number', sa.String(50), nullable=True))
    op.add_column('employees', sa.Column('profile_picture_url', sa.String(500), nullable=True))

    # Create employee_documents table
    op.create_table(
        'employee_documents',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('employee_id', sa.Integer(), nullable=False),
        sa.Column('document_type', sa.String(30), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('url', sa.String(500), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('content_type', sa.String(100), nullable=True),
        sa.Column('uploaded_by_id', sa.Integer(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('verified_by_id', sa.Integer(), nullable=True),
        sa.Column('verified_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['employee_id'], ['employees.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by_id'], ['employees.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['verified_by_id'], ['employees.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_employee_documents_employee_id', 'employee_documents', ['employee_id'])
    op.create_index('ix_employee_documents_type', 'employee_documents', ['document_type'])
    op.create_index('ix_employee_documents_expires_at', 'employee_documents', ['expires_at'])


def downgrade() -> None:
    op.drop_table('employee_documents')
    op.drop_column('employees', 'profile_picture_url')
    op.drop_column('employees', 'id_number')
    op.drop_column('employees', 'email')
