"""Add personas and project personas tables

Revision ID: 202409230002
Revises: 202409230001
Create Date: 2024-09-23 10:00:00

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "202409230002"
down_revision = "202409230001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "personas",
        sa.Column("key", sa.String(length=64), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("maximum_active_tasks", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "project_personas",
        sa.Column("project_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("persona_key", sa.String(length=64), nullable=False),
        sa.Column("limit_per_agent", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["persona_key"], ["personas.key"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("project_id", "persona_key"),
    )


def downgrade() -> None:
    op.drop_table("project_personas")
    op.drop_table("personas")
