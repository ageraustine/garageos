"""Seed new services (Window Tinting, PPF, Vehicle Wrap) to existing chains

Revision ID: 017
Revises: 016
Create Date: 2024-01-01

"""

from alembic import op
import sqlalchemy as sa
from datetime import datetime


# revision identifiers
revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None


# New services to add
NEW_SERVICES = [
    {
        "name": "Window Tinting",
        "description": "Professional window film installation",
        "stages": ["Surface Prep", "Film Cutting", "Application", "Curing"],
        "items": [
            {"name": "Front Windscreen Tint", "price": 8000, "is_labor": True},
            {"name": "Rear Windscreen Tint", "price": 6000, "is_labor": True},
            {"name": "Side Windows (4 pcs)", "price": 12000, "is_labor": True},
            {"name": "Full Car Tint", "price": 25000, "is_labor": True},
            {"name": "Tint Film - Standard", "price": 5000, "is_labor": False},
            {"name": "Tint Film - Premium Ceramic", "price": 15000, "is_labor": False},
            {"name": "Tint Removal", "price": 3000, "is_labor": True},
            {"name": "Sunroof Tint", "price": 4000, "is_labor": True},
        ],
    },
    {
        "name": "Paint Protection Film (PPF)",
        "description": "Clear protective film for paint protection",
        "stages": ["Surface Prep", "Template/Cut", "Application", "Edge Sealing", "Inspection"],
        "items": [
            {"name": "Full Hood PPF", "price": 45000, "is_labor": True},
            {"name": "Full Front (Hood, Fenders, Bumper)", "price": 85000, "is_labor": True},
            {"name": "Full Body PPF", "price": 250000, "is_labor": True},
            {"name": "Door Edge Guards", "price": 8000, "is_labor": True},
            {"name": "Door Cup Protection", "price": 6000, "is_labor": True},
            {"name": "Side Mirrors PPF", "price": 8000, "is_labor": True},
            {"name": "Headlight PPF (pair)", "price": 12000, "is_labor": True},
            {"name": "PPF Film - Standard (per sqm)", "price": 15000, "is_labor": False},
            {"name": "PPF Film - Premium Self-Heal (per sqm)", "price": 25000, "is_labor": False},
            {"name": "PPF Removal", "price": 20000, "is_labor": True},
        ],
    },
    {
        "name": "Vehicle Wrap",
        "description": "Full or partial vinyl wrap for color change or graphics",
        "stages": ["Design/Planning", "Surface Prep", "Disassembly", "Wrap Application", "Reassembly", "Finishing"],
        "items": [
            {"name": "Full Body Wrap - Sedan", "price": 150000, "is_labor": True},
            {"name": "Full Body Wrap - SUV", "price": 180000, "is_labor": True},
            {"name": "Partial Wrap (Hood, Roof)", "price": 45000, "is_labor": True},
            {"name": "Roof Wrap", "price": 25000, "is_labor": True},
            {"name": "Chrome Delete", "price": 35000, "is_labor": True},
            {"name": "Side Mirrors Wrap", "price": 5000, "is_labor": True},
            {"name": "Interior Trim Wrap", "price": 20000, "is_labor": True},
            {"name": "Vinyl Film - Gloss (per roll)", "price": 25000, "is_labor": False},
            {"name": "Vinyl Film - Matte (per roll)", "price": 28000, "is_labor": False},
            {"name": "Vinyl Film - Satin (per roll)", "price": 30000, "is_labor": False},
            {"name": "Vinyl Film - Carbon Fiber (per roll)", "price": 35000, "is_labor": False},
            {"name": "Wrap Removal", "price": 30000, "is_labor": True},
        ],
    },
]


def upgrade() -> None:
    """Add new services to all existing chains."""
    connection = op.get_bind()
    now = datetime.utcnow()

    # Get all chains
    chains = connection.execute(sa.text("SELECT id FROM chains")).fetchall()

    for (chain_id,) in chains:
        for svc_data in NEW_SERVICES:
            # Check if service already exists for this chain
            existing = connection.execute(
                sa.text("SELECT id FROM services WHERE chain_id = :chain_id AND name = :name"),
                {"chain_id": chain_id, "name": svc_data["name"]}
            ).fetchone()

            if existing:
                continue  # Skip if already exists

            # Create service
            result = connection.execute(
                sa.text("""
                    INSERT INTO services (chain_id, name, description, is_active, created_at)
                    VALUES (:chain_id, :name, :description, true, :created_at)
                    RETURNING id
                """),
                {
                    "chain_id": chain_id,
                    "name": svc_data["name"],
                    "description": svc_data["description"],
                    "created_at": now,
                }
            )
            service_id = result.fetchone()[0]

            # Create stages
            for order, stage_name in enumerate(svc_data["stages"]):
                connection.execute(
                    sa.text("""
                        INSERT INTO service_stages (service_id, name, "order", created_at)
                        VALUES (:service_id, :name, :order, :created_at)
                    """),
                    {
                        "service_id": service_id,
                        "name": stage_name,
                        "order": order,
                        "created_at": now,
                    }
                )

            # Create quotation items
            for item in svc_data["items"]:
                connection.execute(
                    sa.text("""
                        INSERT INTO service_quotation_items
                        (service_id, name, price, is_labor, is_active, created_at)
                        VALUES (:service_id, :name, :price, :is_labor, true, :created_at)
                    """),
                    {
                        "service_id": service_id,
                        "name": item["name"],
                        "price": item["price"],
                        "is_labor": item["is_labor"],
                        "created_at": now,
                    }
                )


def downgrade() -> None:
    """Remove the new services."""
    connection = op.get_bind()

    service_names = ["Window Tinting", "Paint Protection Film (PPF)", "Vehicle Wrap"]

    for name in service_names:
        # Get service IDs
        services = connection.execute(
            sa.text("SELECT id FROM services WHERE name = :name"),
            {"name": name}
        ).fetchall()

        for (service_id,) in services:
            # Delete quotation items
            connection.execute(
                sa.text("DELETE FROM service_quotation_items WHERE service_id = :service_id"),
                {"service_id": service_id}
            )
            # Delete stages
            connection.execute(
                sa.text("DELETE FROM service_stages WHERE service_id = :service_id"),
                {"service_id": service_id}
            )
            # Delete service
            connection.execute(
                sa.text("DELETE FROM services WHERE id = :service_id"),
                {"service_id": service_id}
            )
