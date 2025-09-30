from __future__ import annotations

from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ProjectBase(BaseModel):
    name: str
    goal: Optional[str] = None
    direction: Optional[str] = None
    parent_id: Optional[UUID] = Field(default=None, description="Parent project id if nested")
    repository_path: Optional[str] = Field(
        default=None,
        description="Filesystem path to the project's git repository",
    )


class ProjectCreate(ProjectBase):
    pass


class ProjectRead(ProjectBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    goal: Optional[str] = None
    direction: Optional[str] = None
    parent_id: Optional[UUID] = None
    repository_path: Optional[str] = None


class MilestoneBase(BaseModel):
    project_id: UUID
    slug: Optional[str] = None
    name: str
    description: Optional[str] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    status: str = "not_started"


class MilestoneCreate(MilestoneBase):
    pass


class MilestoneRead(MilestoneBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MilestoneUpdate(BaseModel):
    slug: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    due_date: Optional[date] = None


class TaskBase(BaseModel):
    milestone_id: UUID
    phase_id: Optional[UUID] = None
    parent_task_id: Optional[UUID] = None
    external_id: Optional[str] = None
    slug: Optional[str] = None
    title: str
    description: Optional[str] = None
    owner: Optional[str] = None
    assignee_persona: Optional[str] = None
    persona_required: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    effort_estimate: float = 0
    effort_spent: float = 0
    priority_score: float = 0
    risk_level: str = "low"
    severity: str = "minor"
    status: str = "not_started"


class TaskCreate(TaskBase):
    pass


class TaskRead(TaskBase):
    id: UUID
    # Convenience denormalized fields
    project_id: Optional[UUID] = None
    milestone_slug: Optional[str] = None
    lock_version: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TaskPatch(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    owner: Optional[str] = None
    assignee_persona: Optional[str] = None
    persona_required: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    effort_estimate: Optional[float] = None
    effort_spent: Optional[float] = None
    priority_score: Optional[float] = None
    risk_level: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    phase_id: Optional[UUID] = None
    parent_task_id: Optional[UUID] = None
    lock_version: int = Field(..., description="Current lock version for optimistic concurrency")


class TaskUpsertPayload(BaseModel):
    external_id: Optional[str] = None
    project_id: Optional[UUID] = None
    project_slug: Optional[str] = None
    milestone_id: Optional[UUID] = None
    milestone_slug: Optional[str] = None
    parent_task_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    assignee_persona: Optional[str] = None
    effort_estimate: Optional[float] = None
    priority_score: Optional[float] = None
    slug: Optional[str] = None
    options: Optional[dict] = None


class TaskStatusUpdate(BaseModel):
    status: str
    lock_version: Optional[int] = None


class BatchStatusItem(BaseModel):
    id: Optional[UUID] = None
    external_id: Optional[str] = None
    status: str
    lock_version: Optional[int] = None


class BatchStatusResult(BaseModel):
    ok: bool
    id: Optional[UUID] = None
    external_id: Optional[str] = None
    status: int
    lock_version: Optional[int] = None
    error: Optional[str] = None

class ProjectStatusMilestone(BaseModel):
    milestone_id: UUID
    name: str
    total_estimate: float
    remaining_effort: float
    percent_complete: float


class ProjectStatusRead(BaseModel):
    project_id: UUID
    total_estimate: float
    remaining_effort: float
    percent_complete: float
    status_breakdown: dict[str, int]
    milestones: list[ProjectStatusMilestone]


class NextActionSuggestion(BaseModel):
    task_id: UUID
    title: str
    status: str
    persona_required: Optional[str] = None
    priority_score: float
    reason: str


class ProjectNextActions(BaseModel):
    project_id: UUID
    suggestions: list[NextActionSuggestion]


class ProjectStatusSummary(BaseModel):
    project_id: UUID
    summary: str
    generated_at: datetime

class PersonaBase(BaseModel):
    key: str
    name: str
    description: Optional[str] = None
    maximum_active_tasks: Optional[int] = None


class PersonaRead(PersonaBase):
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectPersonaRead(BaseModel):
    project_id: UUID
    persona_key: str
    limit_per_agent: Optional[int] = None
    persona: PersonaBase

    model_config = {"from_attributes": True}


class ProjectPersonaAssignment(BaseModel):
    persona_key: str
    limit_per_agent: Optional[int] = None


class ProjectPersonaUpdatePayload(BaseModel):
    personas: list[ProjectPersonaAssignment]

class BugBase(BaseModel):
    project_id: UUID
    task_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    severity: str = "S3"
    status: str = "open"


class BugCreate(BugBase):
    pass


class BugUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    task_id: Optional[UUID] = None


class BugRead(BugBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EventLogBase(BaseModel):
    project_id: UUID
    milestone_id: Optional[UUID] = None
    task_id: Optional[UUID] = None
    category: str = "note"
    summary: str
    details: Optional[str] = None


class EventLogCreate(EventLogBase):
    pass


class EventLogRead(EventLogBase):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class ContextSnapshotBase(BaseModel):
    repo_id: str
    branch: Optional[str] = None
    workflow_id: Optional[str] = None
    snapshot_path: str
    summary_path: str
    files_ndjson_path: Optional[str] = None
    totals_files: int
    totals_bytes: int
    totals_lines: int
    components_json: Optional[Any] = None
    hotspots_json: Optional[Any] = None

class ContextSnapshotCreate(ContextSnapshotBase):
    pass

class ContextSnapshotRead(ContextSnapshotBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}

class ContextIndexRead(BaseModel):
    repo_id: str
    latest_snapshot_id: int
    updated_at: datetime

    model_config = {"from_attributes": True}
