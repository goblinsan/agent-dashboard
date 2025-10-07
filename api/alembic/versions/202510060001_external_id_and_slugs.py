"""Add slug and assignee_persona to tasks; extend task_status enum

Revision ID: 202510060001
Revises: a9b1c2d3e4f5
Create Date: 2025-10-06

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "202510060001"
down_revision = "a9b1c2d3e4f5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Only add new task columns and indexes not covered by earlier migrations
    bind = op.get_bind()
    insp = sa.inspect(bind)

    task_cols = {c["name"] for c in insp.get_columns("tasks")}
    if "slug" not in task_cols:
        op.add_column("tasks", sa.Column("slug", sa.String(length=128), nullable=True))
    if "assignee_persona" not in task_cols:
        op.add_column("tasks", sa.Column("assignee_persona", sa.String(length=255), nullable=True))

    existing_task_indexes = {idx["name"] for idx in insp.get_indexes("tasks")}
    if "ix_tasks_milestone_slug" not in existing_task_indexes:
        op.create_index(
            "ix_tasks_milestone_slug",
            "tasks",
            ["milestone_id", "slug"],
            unique=True,
            postgresql_where=sa.text("slug IS NOT NULL"),
        )

    # Extend task_status enum to include 'on_hold'
    op.execute("ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'on_hold'")


def downgrade() -> None:
    # Can't easily remove enum value in Postgres; leave as-is.

    try:
        op.drop_index("ix_tasks_milestone_slug", table_name="tasks")
    except Exception:
        pass

    try:
        op.drop_column("tasks", "assignee_persona")
    except Exception:
        pass
    try:
        op.drop_column("tasks", "slug")
    except Exception:
        pass
