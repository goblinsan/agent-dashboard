from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import Milestone, Phase, Task
from app.schemas import TaskCreate, TaskPatch, TaskRead

router = APIRouter(prefix="/v1/tasks", tags=["tasks"])


def _ensure_milestone(db: Session, milestone_id: UUID) -> None:
    if db.get(Milestone, milestone_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Milestone not found")


def _ensure_phase(db: Session, phase_id: Optional[UUID]) -> None:
    if phase_id is not None and db.get(Phase, phase_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phase not found")


def _ensure_parent_task(db: Session, parent_task_id: Optional[UUID]) -> None:
    if parent_task_id is not None and db.get(Task, parent_task_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Parent task not found")


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
def create_task(payload: TaskCreate, db: Session = Depends(get_session)) -> TaskRead:
    _ensure_milestone(db, payload.milestone_id)
    _ensure_phase(db, payload.phase_id)
    _ensure_parent_task(db, payload.parent_task_id)

    task = Task(**payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return TaskRead.model_validate(task)


@router.get("", response_model=list[TaskRead])
def list_tasks(
    milestone_id: Optional[UUID] = None,
    project_id: Optional[UUID] = None,
    phase_id: Optional[UUID] = None,
    db: Session = Depends(get_session),
) -> list[TaskRead]:
    query = db.query(Task)
    if project_id:
        query = query.join(Milestone).filter(Milestone.project_id == project_id)
    if milestone_id:
        query = query.filter(Task.milestone_id == milestone_id)
    if phase_id:
        query = query.filter(Task.phase_id == phase_id)
    tasks = query.order_by(Task.created_at.asc()).all()
    return [TaskRead.model_validate(task) for task in tasks]


@router.get("/{task_id}", response_model=TaskRead)
def get_task(task_id: UUID, db: Session = Depends(get_session)) -> TaskRead:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return TaskRead.model_validate(task)


@router.patch("/{task_id}", response_model=TaskRead)
def update_task(task_id: UUID, payload: TaskPatch, db: Session = Depends(get_session)) -> TaskRead:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if task.lock_version != payload.lock_version:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Task has been modified by another update")

    update_data = payload.model_dump(exclude_unset=True)
    update_data.pop("lock_version", None)

    if "phase_id" in update_data:
        _ensure_phase(db, update_data["phase_id"])
    if "parent_task_id" in update_data:
        _ensure_parent_task(db, update_data["parent_task_id"])

    for field, value in update_data.items():
        setattr(task, field, value)

    task.lock_version += 1
    db.commit()
    db.refresh(task)
    return TaskRead.model_validate(task)
