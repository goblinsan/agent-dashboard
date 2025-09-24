from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import Bug, Project, Task
from app.schemas import BugCreate, BugRead, BugUpdate

router = APIRouter(prefix="/v1/bugs", tags=["bugs"])


@router.get("", response_model=List[BugRead])
def list_bugs(project_id: Optional[UUID] = None, task_id: Optional[UUID] = None, db: Session = Depends(get_session)) -> list[BugRead]:
    query = db.query(Bug)
    if project_id:
        query = query.filter(Bug.project_id == project_id)
    if task_id:
        query = query.filter(Bug.task_id == task_id)
    bugs = query.order_by(Bug.created_at.desc()).all()
    return [BugRead.model_validate(bug) for bug in bugs]


@router.post("", response_model=BugRead, status_code=status.HTTP_201_CREATED)
def create_bug(payload: BugCreate, db: Session = Depends(get_session)) -> BugRead:
    _ensure_project(db, payload.project_id)
    _ensure_task_belongs_to_project(db, payload.task_id, payload.project_id)

    bug = Bug(**payload.model_dump())
    db.add(bug)
    db.commit()
    db.refresh(bug)
    return BugRead.model_validate(bug)


@router.patch("/{bug_id}", response_model=BugRead)
def update_bug(bug_id: UUID, payload: BugUpdate, db: Session = Depends(get_session)) -> BugRead:
    bug = db.get(Bug, bug_id)
    if bug is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bug not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "task_id" in update_data:
        _ensure_task_belongs_to_project(db, update_data["task_id"], bug.project_id)

    for field, value in update_data.items():
        setattr(bug, field, value)

    db.commit()
    db.refresh(bug)
    return BugRead.model_validate(bug)


@router.delete("/{bug_id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
def delete_bug(bug_id: UUID, db: Session = Depends(get_session)) -> Response:
    bug = db.get(Bug, bug_id)
    if bug is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bug not found")
    db.delete(bug)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def _ensure_project(db: Session, project_id: UUID) -> None:
    if db.get(Project, project_id) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project not found")


def _ensure_task_belongs_to_project(db: Session, task_id: Optional[UUID], project_id: UUID) -> None:
    if task_id is None:
        return

    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task not found")

    if task.milestone is None or task.milestone.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Task does not belong to project")
