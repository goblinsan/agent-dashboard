"""Initial projects/milestones/phases/tasks tables

Revision ID: 202409230001
Revises:
Create Date: 2024-09-23 00:00:00

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "202409230001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("DROP TYPE IF EXISTS milestone_status")
    op.execute("DROP TYPE IF EXISTS phase_status")
    op.execute("DROP TYPE IF EXISTS task_risk_level")
    op.execute("DROP TYPE IF EXISTS task_severity")
    op.execute("DROP TYPE IF EXISTS task_status")

    milestone_status = sa.Enum("not_started", "in_progress", "blocked", "done", name="milestone_status")
    phase_status = sa.Enum("not_started", "in_progress", "blocked", "done", name="phase_status")
    risk_level = sa.Enum("low", "medium", "high", name="task_risk_level")
    severity = sa.Enum("nice_to_have", "minor", "major", "critical", name="task_severity")
    task_status = sa.Enum("not_started", "in_progress", "blocked", "in_review", "done", name="task_status")

    op.create_table(
        "projects",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("goal", sa.Text(), nullable=True),
        sa.Column("direction", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "milestones",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("status", milestone_status, server_default="not_started", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "phases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("milestone_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("milestones.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("estimated_effort", sa.Numeric(10, 2), server_default="0", nullable=False),
        sa.Column("remaining_effort", sa.Numeric(10, 2), server_default="0", nullable=False),
        sa.Column("priority_score", sa.Numeric(10, 2), server_default="0", nullable=False),
        sa.Column("status", phase_status, server_default="not_started", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "tasks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("milestone_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("milestones.id", ondelete="CASCADE"), nullable=False),
        sa.Column("phase_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("phases.id", ondelete="SET NULL"), nullable=True),
        sa.Column("parent_task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("owner", sa.String(length=255), nullable=True),
        sa.Column("persona_required", sa.String(length=255), nullable=True),
        sa.Column("acceptance_criteria", sa.Text(), nullable=True),
        sa.Column("effort_estimate", sa.Numeric(10, 2), server_default="0", nullable=False),
        sa.Column("effort_spent", sa.Numeric(10, 2), server_default="0", nullable=False),
        sa.Column("priority_score", sa.Numeric(10, 2), server_default="0", nullable=False),
        sa.Column("risk_level", risk_level, server_default="low", nullable=False),
        sa.Column("severity", severity, server_default="minor", nullable=False),
        sa.Column("status", task_status, server_default="not_started", nullable=False),
        sa.Column("lock_version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("effort_estimate >= 0", name="task_effort_estimate_non_negative"),
        sa.CheckConstraint("effort_spent >= 0", name="task_effort_spent_non_negative"),
    )


def downgrade() -> None:
    op.drop_table("tasks")
    op.drop_table("phases")
    op.drop_table("milestones")
    op.drop_table("projects")

    bind = op.get_bind()
    for enum_name in ["task_status", "task_severity", "task_risk_level", "phase_status", "milestone_status"]:
        postgresql.ENUM(name=enum_name).drop(bind, checkfirst=True)
