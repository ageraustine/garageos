"""Marketplace tables - sellers, categories, listings, conversations.

Revision ID: 018
Revises: 017
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

# revision identifiers, used by Alembic.
revision = '018'
down_revision = '017'
branch_labels = None
depends_on = None


# Default categories to seed
DEFAULT_CATEGORIES = [
    {"name": "Engine Parts", "slug": "engine", "children": [
        "Pistons & Rings", "Gaskets", "Timing Belts", "Fuel Injectors"
    ]},
    {"name": "Brakes", "slug": "brakes", "children": [
        "Brake Pads", "Brake Discs", "Calipers", "Brake Lines"
    ]},
    {"name": "Suspension & Steering", "slug": "suspension", "children": [
        "Shock Absorbers", "Springs", "Control Arms", "Tie Rods"
    ]},
    {"name": "Body Parts", "slug": "body", "children": [
        "Bumpers", "Fenders", "Mirrors", "Lights", "Grilles"
    ]},
    {"name": "Electrical", "slug": "electrical", "children": [
        "Batteries", "Alternators", "Starters", "Sensors", "Wiring"
    ]},
    {"name": "Interior", "slug": "interior", "children": [
        "Seats", "Dashboard", "Steering Wheels", "Floor Mats"
    ]},
    {"name": "Tires & Wheels", "slug": "tires", "children": [
        "Tires", "Rims", "Hubcaps", "Wheel Bearings"
    ]},
    {"name": "Fluids & Oils", "slug": "fluids", "children": [
        "Engine Oil", "Transmission Fluid", "Coolant", "Brake Fluid"
    ]},
    {"name": "Filters", "slug": "filters", "children": [
        "Air Filters", "Oil Filters", "Fuel Filters", "Cabin Filters"
    ]},
    {"name": "Accessories", "slug": "accessories", "children": [
        "Car Audio", "GPS", "Covers", "Tools"
    ]},
]


def upgrade() -> None:
    # marketplace_sellers - seller profiles
    op.create_table(
        'marketplace_sellers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('seller_type', sa.String(20), nullable=False),  # chain or external
        sa.Column('chain_id', sa.Integer(), nullable=True),  # For GarageOS chains
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('logo_url', sa.String(500), nullable=True),
        sa.Column('phone', sa.String(20), nullable=False),
        sa.Column('email', sa.String(200), nullable=True),
        sa.Column('whatsapp', sa.String(20), nullable=True),
        sa.Column('location', sa.String(500), nullable=True),
        sa.Column('city', sa.String(100), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['chain_id'], ['chains.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_marketplace_sellers_chain', 'marketplace_sellers', ['chain_id'])
    op.create_index('ix_marketplace_sellers_type', 'marketplace_sellers', ['seller_type'])
    op.create_index('ix_marketplace_sellers_city', 'marketplace_sellers', ['city'])
    op.create_index('ix_marketplace_sellers_active', 'marketplace_sellers', ['is_active'])

    # marketplace_categories - hierarchical categories
    op.create_table(
        'marketplace_categories',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('parent_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False),
        sa.Column('icon', sa.String(50), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['parent_id'], ['marketplace_categories.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_marketplace_categories_parent', 'marketplace_categories', ['parent_id'])
    op.create_index('ix_marketplace_categories_slug', 'marketplace_categories', ['slug'], unique=True)
    op.create_index('ix_marketplace_categories_active', 'marketplace_categories', ['is_active'])

    # marketplace_listings - product listings
    op.create_table(
        'marketplace_listings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('seller_id', sa.Integer(), nullable=False),
        sa.Column('category_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('price', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), nullable=False, server_default='KES'),
        sa.Column('condition', sa.String(20), nullable=False, server_default='new'),  # new, used, refurbished
        sa.Column('vehicle_make', sa.String(50), nullable=True),
        sa.Column('vehicle_model', sa.String(50), nullable=True),
        sa.Column('vehicle_year_from', sa.Integer(), nullable=True),
        sa.Column('vehicle_year_to', sa.Integer(), nullable=True),
        sa.Column('part_number', sa.String(100), nullable=True),
        sa.Column('brand', sa.String(100), nullable=True),
        sa.Column('quantity_available', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('is_negotiable', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('views_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['seller_id'], ['marketplace_sellers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['category_id'], ['marketplace_categories.id'], ondelete='RESTRICT'),
    )
    op.create_index('ix_marketplace_listings_seller', 'marketplace_listings', ['seller_id'])
    op.create_index('ix_marketplace_listings_category', 'marketplace_listings', ['category_id'])
    op.create_index('ix_marketplace_listings_active', 'marketplace_listings', ['is_active'])
    op.create_index('ix_marketplace_listings_condition', 'marketplace_listings', ['condition'])
    op.create_index('ix_marketplace_listings_price', 'marketplace_listings', ['price'])
    op.create_index('ix_marketplace_listings_vehicle', 'marketplace_listings', ['vehicle_make', 'vehicle_model'])
    op.create_index('ix_marketplace_listings_created', 'marketplace_listings', ['created_at'])

    # marketplace_listing_images - multiple images per listing
    op.create_table(
        'marketplace_listing_images',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('listing_id', sa.Integer(), nullable=False),
        sa.Column('url', sa.String(500), nullable=False),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['listing_id'], ['marketplace_listings.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_marketplace_listing_images_listing', 'marketplace_listing_images', ['listing_id'])

    # marketplace_conversations - chat threads
    op.create_table(
        'marketplace_conversations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('listing_id', sa.Integer(), nullable=False),
        sa.Column('buyer_id', sa.Integer(), nullable=True),  # Employee ID if logged in
        sa.Column('buyer_phone', sa.String(20), nullable=True),  # For external buyers
        sa.Column('buyer_name', sa.String(100), nullable=True),  # For external buyers
        sa.Column('seller_id', sa.Integer(), nullable=False),
        sa.Column('last_message_at', sa.DateTime(), nullable=True),
        sa.Column('is_archived_by_buyer', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_archived_by_seller', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['listing_id'], ['marketplace_listings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['buyer_id'], ['employees.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['seller_id'], ['marketplace_sellers.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_marketplace_conversations_listing', 'marketplace_conversations', ['listing_id'])
    op.create_index('ix_marketplace_conversations_buyer', 'marketplace_conversations', ['buyer_id'])
    op.create_index('ix_marketplace_conversations_seller', 'marketplace_conversations', ['seller_id'])
    op.create_index('ix_marketplace_conversations_last_message', 'marketplace_conversations', ['last_message_at'])

    # marketplace_messages - individual messages
    op.create_table(
        'marketplace_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('conversation_id', sa.Integer(), nullable=False),
        sa.Column('sender_type', sa.String(10), nullable=False),  # buyer or seller
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['conversation_id'], ['marketplace_conversations.id'], ondelete='CASCADE'),
    )
    op.create_index('ix_marketplace_messages_conversation', 'marketplace_messages', ['conversation_id'])
    op.create_index('ix_marketplace_messages_created', 'marketplace_messages', ['created_at'])

    # Seed default categories
    connection = op.get_bind()
    now = datetime.utcnow()

    for order, cat_data in enumerate(DEFAULT_CATEGORIES):
        # Insert parent category
        result = connection.execute(
            sa.text("""
                INSERT INTO marketplace_categories (name, slug, sort_order, is_active, created_at)
                VALUES (:name, :slug, :sort_order, true, :created_at)
                RETURNING id
            """),
            {
                "name": cat_data["name"],
                "slug": cat_data["slug"],
                "sort_order": order,
                "created_at": now,
            }
        )
        parent_id = result.fetchone()[0]

        # Insert child categories
        for child_order, child_name in enumerate(cat_data.get("children", [])):
            child_slug = f"{cat_data['slug']}-{child_name.lower().replace(' ', '-').replace('&', 'and')}"
            connection.execute(
                sa.text("""
                    INSERT INTO marketplace_categories (parent_id, name, slug, sort_order, is_active, created_at)
                    VALUES (:parent_id, :name, :slug, :sort_order, true, :created_at)
                """),
                {
                    "parent_id": parent_id,
                    "name": child_name,
                    "slug": child_slug,
                    "sort_order": child_order,
                    "created_at": now,
                }
            )


def downgrade() -> None:
    op.drop_table('marketplace_messages')
    op.drop_table('marketplace_conversations')
    op.drop_table('marketplace_listing_images')
    op.drop_table('marketplace_listings')
    op.drop_table('marketplace_categories')
    op.drop_table('marketplace_sellers')
