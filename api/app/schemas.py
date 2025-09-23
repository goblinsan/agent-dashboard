from __future__ import annotations

from datetime import date, datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ProjectBase(BaseModel):
    name: str
    goal: Optional[str] = None
    direction: Optional[str] = None
    parent_id: Optional[UUID] = Field(default=None, description="Parent project id if nested")


class ProjectCreate(ProjectBase):
    pass


class ProjectRead(ProjectBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MilestoneBase(BaseModel):
    project_id: UUID
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


class TaskBase(BaseModel):
    milestone_id: UUID
    phase_id: Optional[UUID] = None
    parent_task_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    owner: Optional[str] = None
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
    lock_version: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TaskPatch(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    owner: Optional[str] = None
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
