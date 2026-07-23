"""Job flow entities

Revision ID: 002
Revises: 001
Create Date: 2026-07-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, ENUM

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Create enum type for line item kind
lineitemkind_enum = ENUM('critical', 'optional', name='lineitemkind', create_type=False)


def upgrade() -> None:
    # Create the lineitemkind enum type
    lineitemkind_enum.create(op.get_bind(), checkfirst=True)
    # customers table
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("phone", sa.String(20), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("consent_flags", JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_customers_phone", "customers", ["phone"], unique=True)

    # vehicles table
    op.create_table(
        "vehicles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("plate", sa.String(20), nullable=False),
        sa.Column("make", sa.String(50), nullable=False),
        sa.Column("model", sa.String(50), nullable=False),
        sa.Column("year", sa.Integer(), nullable=True),
        sa.Column("owner_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["customers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_vehicles_plate", "vehicles", ["plate"], unique=True)
    op.create_index("ix_vehicles_owner_id", "vehicles", ["owner_id"])

    # jobs table
    op.create_table(
        "jobs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("vehicle_id", sa.Integer(), nullable=False),
        sa.Column("branch_id", sa.Integer(), nullable=False),
        sa.Column("advisor_id", sa.Integer(), nullable=False),
        sa.Column("assigned_mechanic_id", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="intake"),
        sa.Column("intake_at", sa.DateTime(), nullable=False),
        sa.Column("promised_ready_at", sa.DateTime(), nullable=True),
        sa.Column("actual_ready_at", sa.DateTime(), nullable=True),
        sa.Column("magic_link_token", sa.String(50), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["vehicle_id"], ["vehicles.id"]),
        sa.ForeignKeyConstraint(["branch_id"], ["branches.id"]),
        sa.ForeignKeyConstraint(["advisor_id"], ["employees.id"]),
        sa.ForeignKeyConstraint(["assigned_mechanic_id"], ["employees.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_jobs_vehicle_id", "jobs", ["vehicle_id"])
    op.create_index("ix_jobs_branch_id", "jobs", ["branch_id"])
    op.create_index("ix_jobs_advisor_id", "jobs", ["advisor_id"])
    op.create_index("ix_jobs_assigned_mechanic_id", "jobs", ["assigned_mechanic_id"])
    op.create_index("ix_jobs_status", "jobs", ["status"])
    op.create_index("ix_jobs_magic_link_token", "jobs", ["magic_link_token"], unique=True)

    # media_assets table (before line_items due to FK)
    op.create_table(
        "media_assets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(10), nullable=False),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("compressed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("opened_by_customer_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_media_assets_job_id", "media_assets", ["job_id"])

    # estimates table
    op.create_table(
        "estimates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("approved_ip", sa.String(45), nullable=True),
        sa.Column("total_approved", sa.Numeric(12, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_estimates_job_id", "estimates", ["job_id"])

    # line_items table
    op.create_table(
        "line_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("estimate_id", sa.Integer(), nullable=False),
        sa.Column("kind", lineitemkind_enum, nullable=False, server_default="critical"),
        sa.Column("label", sa.String(200), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("justification_media_id", sa.Integer(), nullable=True),
        sa.Column("voice_source_lang", sa.String(10), nullable=True),
        sa.Column("parsed_from_voice", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["estimate_id"], ["estimates.id"]),
        sa.ForeignKeyConstraint(["justification_media_id"], ["media_assets.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_line_items_estimate_id", "line_items", ["estimate_id"])

    # payments table
    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.Integer(), nullable=False),
        sa.Column("type", sa.String(20), nullable=False),
        sa.Column("payer_phone", sa.String(20), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("daraja_checkout_id", sa.String(100), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("idempotency_key", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["job_id"], ["jobs.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_payments_job_id", "payments", ["job_id"])
    op.create_index("ix_payments_idempotency_key", "payments", ["idempotency_key"], unique=True)
    op.create_index("ix_payments_daraja_checkout_id", "payments", ["daraja_checkout_id"])


def downgrade() -> None:
    op.drop_table("payments")
    op.drop_table("line_items")
    op.drop_table("estimates")
    op.drop_table("media_assets")
    op.drop_table("jobs")
    op.drop_table("vehicles")
    op.drop_table("customers")
    # Drop the lineitemkind enum type
    lineitemkind_enum.drop(op.get_bind(), checkfirst=True)
