"""Add unique index for external_id per project and ensure milestone project+slug uniqueness

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2025-10-04 01:00:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "c3d4e5f6a7b8"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # create unique index on external_id + project_id to enforce idempotency per-project
    conn = op.get_bind()
    # add project_id column if missing (schema expects it in models)
    # Note: adding NOT NULL column requires a default; migrate in two steps if necessary in production
    try:
        op.add_column("tasks", sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True))
    except Exception:
        # column may already exist
        pass

    # create unique index concurrently if possible
    op.create_index("ux_tasks_external_project", "tasks", [sa.text("external_id"), sa.text("project_id")], unique=True)

    # ensure milestones have unique (project_id, slug)
    op.create_index("ux_milestones_project_slug", "milestones", [sa.text("project_id"), sa.text("slug")], unique=True)


def downgrade() -> None:
    op.drop_index("ux_milestones_project_slug", table_name="milestones")
    op.drop_index("ux_tasks_external_project", table_name="tasks")
    try:
        op.drop_column("tasks", "project_id")
    except Exception:
        pass
