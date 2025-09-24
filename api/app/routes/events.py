from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import EventLog, Milestone, Project, Task
from app.schemas import EventLogCreate, EventLogRead

router = APIRouter(prefix="/v1/events", tags=["events"])


@router.get("", response_model=list[EventLogRead])
def list_events(
    project_id: UUID,
    milestone_id: Optional[UUID] = None,
    task_id: Optional[UUID] = None,
    limit: int = 50,
    db: Session = Depends(get_session),
) -> list[EventLogRead]:
    query = db.query(EventLog).filter(EventLog.project_id == project_id)
    if milestone_id:
        query = query.filter(EventLog.milestone_id == milestone_id)
    if task_id:
        query = query.filter(EventLog.task_id == task_id)
    events = query.order_by(EventLog.created_at.desc()).limit(max(limit, 1)).all()
    return [EventLogRead.model_validate(event) for event in events]


@router.post("", response_model=EventLogRead, status_code=status.HTTP_201_CREATED)
def create_event(payload: EventLogCreate, db: Session = Depends(get_session)) -> EventLogRead:
    _ensure_project(db, payload.project_id)

    data = payload.model_dump()

    milestone = _ensure_milestone(db, data.get("milestone_id"), data["project_id"])
    task = _ensure_task(db, data.get("task_id"), data["project_id"])

    if task is not None:
        if milestone is None:
            data["milestone_id"] = task.milestone_id
        elif task.milestone_id != milestone.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task does not belong to milestone")

    event = EventLog(**data)
    db.add(event)
    db.commit()
    db.refresh(event)
    return EventLogRead.model_validate(event)


def _ensure_project(db: Session, project_id: UUID) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project not found")
    return project


def _ensure_milestone(db: Session, milestone_id: Optional[UUID], project_id: UUID) -> Optional[Milestone]:
    if milestone_id is None:
        return None

    milestone = db.get(Milestone, milestone_id)
    if milestone is None or milestone.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Milestone not found for project")
    return milestone


def _ensure_task(db: Session, task_id: Optional[UUID], project_id: UUID) -> Optional[Task]:
    if task_id is None:
        return None

    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task not found")

    milestone = task.milestone
    if milestone is None or milestone.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task does not belong to project")
    return task
