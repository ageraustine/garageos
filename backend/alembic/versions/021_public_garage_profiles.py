"""Public garage profiles - mini website for each garage

Revision ID: 021
Revises: 020
Create Date: 2026-07-23
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "021"
down_revision: Union[str, None] = "020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ═══════════════════════════════════════════════════════════════════
    # CHAIN - Public profile fields
    # ═══════════════════════════════════════════════════════════════════

    # Hero section
    op.add_column("chains", sa.Column("tagline", sa.String(150), nullable=True))
    op.add_column("chains", sa.Column("cover_image_url", sa.String(500), nullable=True))

    # About section
    op.add_column("chains", sa.Column("description", sa.String(5000), nullable=True))
    op.add_column("chains", sa.Column("year_established", sa.Integer(), nullable=True))
    op.add_column("chains", sa.Column("specialties", JSONB(), nullable=True))

    # Contact info
    op.add_column("chains", sa.Column("phone", sa.String(20), nullable=True))
    op.add_column("chains", sa.Column("whatsapp", sa.String(20), nullable=True))
    op.add_column("chains", sa.Column("email", sa.String(200), nullable=True))

    # Location
    op.add_column("chains", sa.Column("address", sa.String(500), nullable=True))
    op.add_column("chains", sa.Column("city", sa.String(100), nullable=True))
    op.create_index("ix_chains_city", "chains", ["city"])

    # Online presence
    op.add_column("chains", sa.Column("website", sa.String(200), nullable=True))
    op.add_column("chains", sa.Column("social_links", JSONB(), nullable=True))

    # Gallery
    op.add_column("chains", sa.Column("gallery_images", JSONB(), nullable=True))

    # Operating hours
    op.add_column("chains", sa.Column("operating_hours", JSONB(), nullable=True))

    # Visibility
    op.add_column(
        "chains",
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "chains",
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.create_index("ix_chains_is_public", "chains", ["is_public"])
    op.create_index("ix_chains_is_featured", "chains", ["is_featured"])

    # ═══════════════════════════════════════════════════════════════════
    # BRANCH - Enhanced location details
    # ═══════════════════════════════════════════════════════════════════

    op.add_column("branches", sa.Column("address", sa.String(500), nullable=True))
    op.add_column("branches", sa.Column("city", sa.String(100), nullable=True))
    op.add_column("branches", sa.Column("phone", sa.String(20), nullable=True))
    op.add_column("branches", sa.Column("whatsapp", sa.String(20), nullable=True))
    op.add_column("branches", sa.Column("operating_hours", JSONB(), nullable=True))
    op.add_column("branches", sa.Column("image_url", sa.String(500), nullable=True))
    op.add_column(
        "branches",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
    )


def downgrade() -> None:
    # Branch columns
    op.drop_column("branches", "is_active")
    op.drop_column("branches", "image_url")
    op.drop_column("branches", "operating_hours")
    op.drop_column("branches", "whatsapp")
    op.drop_column("branches", "phone")
    op.drop_column("branches", "city")
    op.drop_column("branches", "address")

    # Chain columns
    op.drop_index("ix_chains_is_featured", "chains")
    op.drop_index("ix_chains_is_public", "chains")
    op.drop_column("chains", "is_featured")
    op.drop_column("chains", "is_public")
    op.drop_column("chains", "operating_hours")
    op.drop_column("chains", "gallery_images")
    op.drop_column("chains", "social_links")
    op.drop_column("chains", "website")
    op.drop_index("ix_chains_city", "chains")
    op.drop_column("chains", "city")
    op.drop_column("chains", "address")
    op.drop_column("chains", "email")
    op.drop_column("chains", "whatsapp")
    op.drop_column("chains", "phone")
    op.drop_column("chains", "specialties")
    op.drop_column("chains", "year_established")
    op.drop_column("chains", "description")
    op.drop_column("chains", "cover_image_url")
    op.drop_column("chains", "tagline")
