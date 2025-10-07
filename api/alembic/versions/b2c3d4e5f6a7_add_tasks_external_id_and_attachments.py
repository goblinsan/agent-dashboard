"""Add external_id to tasks and create attachments table

Revision ID: b2c3d4e5f6a7
Revises: 5c2b1b9e3a7f
Create Date: 2025-10-04 00:30:00.000000

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "b2c3d4e5f6a7"
down_revision = "5c2b1b9e3a7f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add external_id column to tasks
    op.add_column("tasks", sa.Column("external_id", sa.String(length=255), nullable=True))
    # Create unique index to enforce idempotency
    op.create_index("ix_tasks_external_id", "tasks", ["external_id"], unique=True)

    # Create attachments table
    op.create_table(
        "attachments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("path", sa.String(length=1024), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["task_id"], ["tasks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    # Drop attachments table
    op.drop_table("attachments")
    # Drop unique index and column
    op.drop_index("ix_tasks_external_id", table_name="tasks")
    op.drop_column("tasks", "external_id")
