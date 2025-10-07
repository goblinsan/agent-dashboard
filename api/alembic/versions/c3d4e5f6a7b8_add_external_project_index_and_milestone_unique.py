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
    insp = sa.inspect(conn)

    # add project_id column if missing (schema expects it in models)
    try:
        op.add_column("tasks", sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=True))
    except Exception:
        pass

    # drop legacy single-column unique index if present
    existing_indexes = {idx["name"] for idx in insp.get_indexes("tasks")}
    if "ix_tasks_external_id" in existing_indexes:
        try:
            op.drop_index("ix_tasks_external_id", table_name="tasks")
        except Exception:
            pass

    if "ux_tasks_external_project" not in existing_indexes:
        op.create_index("ux_tasks_external_project", "tasks", [sa.text("external_id"), sa.text("project_id")], unique=True)

    # ensure milestones have unique (project_id, slug)
    milestone_indexes = {idx["name"] for idx in insp.get_indexes("milestones")}
    if "ux_milestones_project_slug" not in milestone_indexes and op.f("ux_milestones_project_id_slug") not in milestone_indexes:
        op.create_index("ux_milestones_project_slug", "milestones", [sa.text("project_id"), sa.text("slug")], unique=True)


def downgrade() -> None:
    try:
        op.drop_index("ux_milestones_project_slug", table_name="milestones")
    except Exception:
        pass
    try:
        op.drop_index("ux_tasks_external_project", table_name="tasks")
    except Exception:
        pass
    try:
        op.drop_column("tasks", "project_id")
    except Exception:
        pass
