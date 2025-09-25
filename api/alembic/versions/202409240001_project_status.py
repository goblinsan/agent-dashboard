"""Add project status column

Revision ID: 202409240001
Revises: 202409230004
Create Date: 2025-09-24 05:00:00

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "202409240001"
down_revision = "202409230004"
branch_labels = None
depends_on = None


PROJECT_STATUS_ENUM = sa.Enum(
    "planning",
    "in_progress",
    "on_hold",
    "completed",
    "archived",
    name="project_status",
)


def upgrade() -> None:
    PROJECT_STATUS_ENUM.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "projects",
        sa.Column("status", PROJECT_STATUS_ENUM, nullable=False, server_default="planning"),
    )
    op.execute("UPDATE projects SET status = 'planning' WHERE status IS NULL")
    op.alter_column("projects", "status", server_default=None)



def downgrade() -> None:
    op.drop_column("projects", "status")
    PROJECT_STATUS_ENUM.drop(op.get_bind(), checkfirst=True)
