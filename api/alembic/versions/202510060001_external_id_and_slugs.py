"""Add external_id/slug to tasks, slug to milestones, extend task_status

Revision ID: 202510060001
Revises: 202409230004
Create Date: 2025-10-06

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "202510060001"
# Assuming last migration is 202409230004_event_log.py
# Update this if different in your repo state
# You can rebase/rename as needed.
down_revision = "202409230004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add slug to milestones
    op.add_column("milestones", sa.Column("slug", sa.String(length=128), nullable=True))
    op.create_index("ix_milestones_project_slug", "milestones", ["project_id", "slug"], unique=True, postgresql_where=sa.text("slug IS NOT NULL"))

    # Add external_id, slug, assignee_persona to tasks
    op.add_column("tasks", sa.Column("external_id", sa.String(length=255), nullable=True))
    op.add_column("tasks", sa.Column("slug", sa.String(length=128), nullable=True))
    op.add_column("tasks", sa.Column("assignee_persona", sa.String(length=255), nullable=True))

    # Unique indexes for tasks
    op.create_index("ix_tasks_external_id_unique", "tasks", ["external_id"], unique=True, postgresql_where=sa.text("external_id IS NOT NULL"))
    op.create_index("ix_tasks_milestone_slug", "tasks", ["milestone_id", "slug"], unique=True, postgresql_where=sa.text("slug IS NOT NULL"))

    # Extend task_status enum to include 'on_hold'
    bind = op.get_bind()
    insp = sa.inspect(bind)
    # Create new enum type
    op.execute("ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'on_hold'")


def downgrade() -> None:
    # Can't easily remove enum value in Postgres; leave as-is.

    # Drop indexes
    op.drop_index("ix_tasks_milestone_slug", table_name="tasks")
    op.drop_index("ix_tasks_external_id_unique", table_name="tasks")
    op.drop_index("ix_milestones_project_slug", table_name="milestones")

    # Drop columns
    op.drop_column("tasks", "assignee_persona")
    op.drop_column("tasks", "slug")
    op.drop_column("tasks", "external_id")
    op.drop_column("milestones", "slug")
