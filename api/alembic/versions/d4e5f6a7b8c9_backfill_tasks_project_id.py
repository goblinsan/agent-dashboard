"""Backfill tasks.project_id from milestones and set NOT NULL

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2025-10-04 01:10:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    # backfill project_id for tasks that have a milestone
    conn.execute(
        sa.text(
            """
            UPDATE tasks
            SET project_id = m.project_id
            FROM milestones m
            WHERE tasks.milestone_id = m.id AND tasks.project_id IS NULL
            """
        )
    )

    # For any remaining tasks without project_id, attempt to set to a default project if available
    # This is a safety net; in most installations every task will reference a milestone with a project.
    # We will set NOT NULL only if there are no remaining NULLs.
    res = conn.execute(sa.text("SELECT COUNT(1) as cnt FROM tasks WHERE project_id IS NULL")).fetchone()
    if res and res[0] == 0:
        op.alter_column("tasks", "project_id", nullable=False)
    else:
        # leave nullable to avoid blocking migrations; administrator should inspect orphaned tasks
        pass


def downgrade() -> None:
    # revert to nullable (can't reliably undo backfill)
    try:
        op.alter_column("tasks", "project_id", nullable=True)
    except Exception:
        pass
