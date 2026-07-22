"""Customer CRM enhancements - add fields and notes table.

Revision ID: 009
Revises: 008
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to customers table
    op.add_column('customers', sa.Column('chain_id', sa.Integer(), nullable=True))
    op.add_column('customers', sa.Column('email', sa.String(200), nullable=True))
    op.add_column('customers', sa.Column('address', sa.String(500), nullable=True))
    op.add_column('customers', sa.Column('tags', JSONB(), nullable=True))

    # Create foreign key for chain_id
    op.create_foreign_key(
        'fk_customers_chain_id',
        'customers', 'chains',
        ['chain_id'], ['id'],
        ondelete='CASCADE'
    )

    # Create index on chain_id
    op.create_index('ix_customers_chain_id', 'customers', ['chain_id'])

    # Drop unique constraint on phone if it exists (now unique per chain, not globally)
    # The constraint may have different names depending on how it was created
    from sqlalchemy import inspect
    from alembic import op as alembic_op
    bind = alembic_op.get_bind()
    inspector = inspect(bind)

    # Get unique constraints on customers table
    unique_constraints = inspector.get_unique_constraints('customers')
    for constraint in unique_constraints:
        if 'phone' in constraint.get('column_names', []):
            op.drop_constraint(constraint['name'], 'customers', type_='unique')
            break

    # Create customer_notes table
    op.create_table(
        'customer_notes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('customer_id', sa.Integer(), nullable=False),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('content', sa.String(1000), nullable=False),
        sa.Column('is_pinned', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['customer_id'], ['customers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_id'], ['employees.id'], ondelete='SET NULL'),
    )
    op.create_index('ix_customer_notes_customer_id', 'customer_notes', ['customer_id'])
    op.create_index('ix_customer_notes_created_by_id', 'customer_notes', ['created_by_id'])


def downgrade() -> None:
    # Drop customer_notes table
    op.drop_index('ix_customer_notes_created_by_id', 'customer_notes')
    op.drop_index('ix_customer_notes_customer_id', 'customer_notes')
    op.drop_table('customer_notes')

    # Drop new columns from customers
    op.drop_index('ix_customers_chain_id', 'customers')
    op.drop_constraint('fk_customers_chain_id', 'customers', type_='foreignkey')
    op.drop_column('customers', 'tags')
    op.drop_column('customers', 'address')
    op.drop_column('customers', 'email')
    op.drop_column('customers', 'chain_id')
