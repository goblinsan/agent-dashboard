from __future__ import annotations

from typing import Optional
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Response
import sqlalchemy as sa
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import Milestone, Phase, Task, Attachment, Project
from app.schemas import TaskCreate, TaskPatch, TaskRead
from sqlalchemy import exc as sa_exc
import base64
import os
from pathlib import Path


ATTACHMENTS_DIR = Path(os.environ.get("ATTACHMENTS_DIR", "/data/attachments"))
ATTACHMENTS_DIR.mkdir(parents=True, exist_ok=True)


def _resolve_milestone_by_slug(db: Session, project_id: UUID, slug: str) -> Optional[Milestone]:
    # simple slug match using the slug column if present, else fallback to name slug
    m = db.query(Milestone).filter(Milestone.project_id == project_id)
    if hasattr(Milestone, "slug"):
        found = m.filter(sa.func.lower(Milestone.slug) == slug.lower()).first()
        if found:
            return found

    # fallback: compute slug from name
    for mm in m.all():
        if mm.name and mm.name.lower().replace(" ", "-") == slug.lower():
            return mm
    return None


def _resolve_project_by_slug(db: Session, slug: str) -> Optional[Project]:
    # simple slug match against project.name
    for p in db.query(Project).all():
        if p.name and p.name.lower().replace(" ", "-") == slug.lower():
            return p
    return None

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


@router.post("", response_model=TaskRead)
def create_task(payload: TaskCreate, response: Response, db: Session = Depends(get_session)) -> TaskRead:
    create_data = payload.model_dump()

    # Resolve project by slug if provided
    project_id = create_data.get("project_id")
    if not project_id and create_data.get("project_slug"):
        proj = _resolve_project_by_slug(db, create_data["project_slug"])
        if proj is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found by slug")
        project_id = proj.id
    create_data["project_id"] = project_id

    # Resolve milestone by slug (optionally create)
    milestone_id = create_data.get("milestone_id")
    if not milestone_id and create_data.get("milestone_slug"):
        if not project_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="project_id or project_slug required to resolve milestone_slug")
        m = _resolve_milestone_by_slug(db, project_id, create_data["milestone_slug"])
        options = create_data.get("options") or {}
        if m is None and options.get("create_milestone_if_missing"):
            # create a minimal milestone
            nm = Milestone(project_id=project_id, name=create_data["milestone_slug"].replace("-", " "))
            db.add(nm)
            db.commit()
            db.refresh(nm)
            milestone_id = nm.id
        elif m is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found by slug")
        else:
            milestone_id = m.id

    # Resolve parent task by external id if provided
    parent_task_id = create_data.get("parent_task_id")
    if not parent_task_id and create_data.get("parent_task_external_id"):
        parent = db.query(Task).filter(Task.external_id == create_data["parent_task_external_id"]).first()
        if parent is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent task not found by external_id")
        parent_task_id = parent.id

    # idempotency: if external_id provided, attempt transactional lookup per-project
    created = False
    if create_data.get("external_id"):
        if not project_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="project_id or project_slug required when external_id is provided")
        # SELECT FOR UPDATE to prevent races
        existing = (
            db.query(Task)
            .with_for_update()
            .filter(Task.external_id == create_data["external_id"], Task.project_id == project_id)
            .first()
        )
        if existing:
            response.status_code = status.HTTP_200_OK
            response.headers["Location"] = f"/v1/tasks/{existing.id}"
            return TaskRead.model_validate(existing)

    # validations
    _ensure_milestone(db, milestone_id)
    _ensure_phase(db, create_data.get("phase_id"))
    _ensure_parent_task(db, parent_task_id)

    # Prepare creation payload
    if milestone_id:
        create_data["milestone_id"] = milestone_id
    if parent_task_id:
        create_data["parent_task_id"] = parent_task_id

    # Only pass columns that exist on the Task table to the constructor
    task_columns = {c.name for c in Task.__table__.columns}
    task_kwargs = {k: v for k, v in create_data.items() if k in task_columns}
    task = Task(**task_kwargs)
    db.add(task)
    try:
        db.commit()
    except sa_exc.IntegrityError as e:
        # possible uniqueness violation across projects or concurrent insert
        db.rollback()
        # if the conflict was external_id within same project, return 200 existing
        if create_data.get("external_id") and project_id:
            existing = (
                db.query(Task)
                .filter(Task.external_id == create_data["external_id"], Task.project_id == project_id)
                .first()
            )
            if existing:
                response.status_code = status.HTTP_200_OK
                response.headers["Location"] = f"/v1/tasks/{existing.id}"
                return TaskRead.model_validate(existing)
        # otherwise raise conflict
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Conflict creating task")

    db.refresh(task)
    created = True

    # handle attachments (store files and create Attachment rows)
    attachments = create_data.get("attachments") or []
    for att in attachments:
        name = att.get("name")
        content_b64 = att.get("content_base64")
        if not name or not content_b64:
            continue
        try:
            data = base64.b64decode(content_b64)
        except Exception:
            continue
        fname = f"{task.id}-{name}"
        fpath = ATTACHMENTS_DIR / fname
        fpath.write_bytes(data)
        a = Attachment(task_id=task.id, name=name, path=str(fpath))
        db.add(a)
    if attachments:
        db.commit()
        db.refresh(task)

    # set response code and Location header
    response.status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
    response.headers["Location"] = f"/v1/tasks/{task.id}"
    # include milestone_slug if provided in request
    result = TaskRead.model_validate(task)
    if create_data.get("milestone_slug"):
        result.milestone_slug = create_data.get("milestone_slug")
    return result


@router.get("", response_model=list[TaskRead])
def list_tasks(
    external_id: Optional[str] = None,
    project_id: Optional[UUID] = None,
    project_slug: Optional[str] = None,
    milestone_id: Optional[UUID] = None,
    created_after: Optional[datetime] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_session),
) -> list[TaskRead]:
    query = db.query(Task)
    if project_slug and not project_id:
        proj = _resolve_project_by_slug(db, project_slug)
        if proj is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found by slug")
        project_id = proj.id
    if project_id:
        query = query.filter(Task.project_id == project_id)
    if external_id:
        query = query.filter(Task.external_id == external_id)
    if milestone_id:
        query = query.filter(Task.milestone_id == milestone_id)
    if created_after:
        query = query.filter(Task.created_at > created_after)
    tasks = query.order_by(Task.created_at.asc()).limit(limit).offset(offset).all()
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

    # optimistic locking: if lock_version provided and mismatches, return 409
    if getattr(payload, "lock_version", None) is not None and task.lock_version != payload.lock_version:
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
