"""Auto-create marketplace seller profiles for existing chains.

Revision ID: 019
Revises: 018
Create Date: 2024-01-01

"""

from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers
revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create marketplace seller profiles for all existing chains."""
    connection = op.get_bind()
    now = datetime.utcnow()

    # Get all chains that don't already have a seller profile
    chains = connection.execute(
        sa.text("""
            SELECT c.id, c.display_name, c.branding
            FROM chains c
            LEFT JOIN marketplace_sellers ms ON ms.chain_id = c.id
            WHERE ms.id IS NULL
        """)
    ).fetchall()

    for chain in chains:
        chain_id = chain[0]
        display_name = chain[1]
        branding = chain[2]

        # Get HQ user's phone (or any active employee as fallback)
        hq_user = connection.execute(
            sa.text("""
                SELECT phone, email
                FROM employees
                WHERE chain_id = :chain_id
                  AND role = 'hq'
                  AND is_active = true
                ORDER BY id
                LIMIT 1
            """),
            {"chain_id": chain_id}
        ).fetchone()

        if not hq_user:
            # Fallback to any active employee
            hq_user = connection.execute(
                sa.text("""
                    SELECT phone, email
                    FROM employees
                    WHERE chain_id = :chain_id
                      AND is_active = true
                    ORDER BY id
                    LIMIT 1
                """),
                {"chain_id": chain_id}
            ).fetchone()

        if not hq_user:
            # Skip chains with no employees
            continue

        phone = hq_user[0]
        email = hq_user[1]

        # Get first branch name for city
        first_branch = connection.execute(
            sa.text("""
                SELECT name
                FROM branches
                WHERE chain_id = :chain_id
                ORDER BY id
                LIMIT 1
            """),
            {"chain_id": chain_id}
        ).fetchone()

        city = first_branch[0] if first_branch else None

        # Get logo from branding if available
        logo_url = None
        if branding and isinstance(branding, dict):
            logo_url = branding.get("logo_url")

        # Create seller profile
        connection.execute(
            sa.text("""
                INSERT INTO marketplace_sellers
                (seller_type, chain_id, name, phone, email, logo_url, city, is_verified, is_active, created_at, updated_at)
                VALUES ('chain', :chain_id, :name, :phone, :email, :logo_url, :city, true, true, :now, :now)
            """),
            {
                "chain_id": chain_id,
                "name": display_name,
                "phone": phone,
                "email": email,
                "logo_url": logo_url,
                "city": city,
                "now": now,
            }
        )


def downgrade() -> None:
    """Remove auto-created seller profiles for chains."""
    connection = op.get_bind()

    # Delete all chain-type sellers (they were auto-created)
    connection.execute(
        sa.text("DELETE FROM marketplace_sellers WHERE seller_type = 'chain'")
    )
