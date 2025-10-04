"""Add slug column to milestones

Revision ID: a1b2c3d4e5f6
Revises: 5c2b1b9e3a7f
Create Date: 2025-10-04 00:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column
from sqlalchemy import String


revision = "a1b2c3d4e5f6"
down_revision = "5c2b1b9e3a7f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # add nullable slug column
    op.add_column("milestones", sa.Column("slug", sa.String(length=255), nullable=True))

    # populate slug from name using a simple SQL function
    conn = op.get_bind()
    # simple slug generation: lower, remove non-alnum to '-', collapse '--'
    conn.execute(
        sa.text(
            """
            UPDATE milestones
            SET slug = regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')
            WHERE slug IS NULL
            """
        )
    )

    # create case-insensitive index on slug
    op.create_index("ix_milestones_slug_lower", "milestones", [sa.text("lower(slug)")], unique=False)


def downgrade() -> None:
    op.drop_index("ix_milestones_slug_lower", table_name="milestones")
    op.drop_column("milestones", "slug")
