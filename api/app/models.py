import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import CheckConstraint, Enum, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Date, DateTime, Integer, Numeric, String, Text

from .db import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    goal: Mapped[str | None] = mapped_column(Text, nullable=True)
    direction: Mapped[str | None] = mapped_column(Text, nullable=True)
    repository_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    parent = relationship("Project", remote_side=[id], back_populates="children")
    children = relationship("Project", back_populates="parent", cascade="all, delete-orphan")
    milestones = relationship("Milestone", back_populates="project", cascade="all, delete-orphan")
    personas = relationship("ProjectPersona", back_populates="project", cascade="all, delete-orphan")
    bugs = relationship("Bug", back_populates="project", cascade="all, delete-orphan")
    events = relationship("EventLog", back_populates="project", cascade="all, delete-orphan")


class Milestone(Base):
    __tablename__ = "milestones"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    # Stable identifier within a project for coordinator-friendly addressing (optional)
    slug: Mapped[str | None] = mapped_column(String(128), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(
        Enum("not_started", "in_progress", "blocked", "done", name="milestone_status"),
        default="not_started",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="milestones")
    phases = relationship("Phase", back_populates="milestone", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="milestone", cascade="all, delete-orphan")
    events = relationship("EventLog", back_populates="milestone")


class Phase(Base):
    __tablename__ = "phases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    milestone_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("milestones.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    estimated_effort: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    remaining_effort: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    priority_score: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    status: Mapped[str] = mapped_column(
        Enum("not_started", "in_progress", "blocked", "done", name="phase_status"),
        default="not_started",
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    milestone = relationship("Milestone", back_populates="phases")
    tasks = relationship("Task", back_populates="phase", cascade="all, delete-orphan")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    milestone_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("milestones.id", ondelete="CASCADE"), nullable=False)
    phase_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("phases.id", ondelete="SET NULL"), nullable=True)
    parent_task_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True)
    # External system identifier for upserts/resolve
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Stable slug within a milestone for natural key fallback
    slug: Mapped[str | None] = mapped_column(String(128), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Preferred assignee persona key (coordinator-friendly)
    assignee_persona: Mapped[str | None] = mapped_column(String(255), nullable=True)
    persona_required: Mapped[str | None] = mapped_column(String(255), nullable=True)
    acceptance_criteria: Mapped[str | None] = mapped_column(Text, nullable=True)
    effort_estimate: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    effort_spent: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    priority_score: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    risk_level: Mapped[str] = mapped_column(
        Enum("low", "medium", "high", name="task_risk_level"),
        default="low",
        nullable=False,
    )
    severity: Mapped[str] = mapped_column(
        Enum("nice_to_have", "minor", "major", "critical", name="task_severity"),
        default="minor",
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        Enum("not_started", "in_progress", "blocked", "in_review", "done", "on_hold", name="task_status"),
        default="not_started",
        nullable=False,
    )
    lock_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    milestone = relationship("Milestone", back_populates="tasks")
    phase = relationship("Phase", back_populates="tasks")
    parent = relationship("Task", remote_side=[id], back_populates="children")
    children = relationship("Task", back_populates="parent", cascade="all, delete-orphan")
    bugs = relationship("Bug", back_populates="task")
    events = relationship("EventLog", back_populates="task")

    __table_args__ = (
        CheckConstraint("effort_estimate >= 0", name="task_effort_estimate_non_negative"),
        CheckConstraint("effort_spent >= 0", name="task_effort_spent_non_negative"),
        # Unique external_id across all tasks when provided
        # Note: enforced via migration with conditional unique index if needed
    )


class Persona(Base):
    __tablename__ = "personas"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    maximum_active_tasks: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    projects = relationship("ProjectPersona", back_populates="persona", cascade="all, delete-orphan")


class ProjectPersona(Base):
    __tablename__ = "project_personas"

    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    persona_key: Mapped[str] = mapped_column(String(64), ForeignKey("personas.key", ondelete="CASCADE"), primary_key=True)
    limit_per_agent: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="personas")
    persona = relationship("Persona", back_populates="projects")


class Bug(Base):
    __tablename__ = "bugs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    task_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(2), nullable=False, default="S3")
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="bugs")
    task = relationship("Task", back_populates="bugs")


class EventLog(Base):
    __tablename__ = "event_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    milestone_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("milestones.id", ondelete="SET NULL"), nullable=True)
    task_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False, default="note")
    summary: Mapped[str] = mapped_column(String(255), nullable=False)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    project = relationship("Project", back_populates="events")
    milestone = relationship("Milestone", back_populates="events")
    task = relationship("Task", back_populates="events")


class ContextSnapshot(Base):
    __tablename__ = "context_snapshot"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    repo_id: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    branch: Mapped[str | None] = mapped_column(String(255), nullable=True)
    workflow_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    snapshot_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    summary_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    files_ndjson_path: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    totals_files: Mapped[int] = mapped_column(Integer, nullable=False)
    totals_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    totals_lines: Mapped[int] = mapped_column(Integer, nullable=False)
    components_json: Mapped[Any] = mapped_column(JSONB, nullable=True)
    hotspots_json: Mapped[Any] = mapped_column(JSONB, nullable=True)


class ContextIndex(Base):
    __tablename__ = "context_index"

    repo_id: Mapped[str] = mapped_column(String(255), primary_key=True)
    latest_snapshot_id: Mapped[int] = mapped_column(Integer, ForeignKey("context_snapshot.id"), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
