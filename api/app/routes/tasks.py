from __future__ import annotations

from typing import Optional, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import Milestone, Phase, Task, Project
from app.schemas import (
    TaskCreate,
    TaskPatch,
    TaskRead,
    TaskUpsertPayload,
    TaskStatusUpdate,
    BatchStatusItem,
    BatchStatusResult,
)

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
    return _as_task_read(task)


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
    return [_as_task_read(task) for task in tasks]


@router.get("/{task_id}", response_model=TaskRead)
def get_task(task_id: UUID, db: Session = Depends(get_session)) -> TaskRead:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return _as_task_read(task)


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
    return _as_task_read(task)


def _weak_etag_for(task: Task) -> str:
    return f'W/"{task.lock_version}"'
def _as_task_read(task: Task) -> TaskRead:
    # Ensure milestone relationship is available for denormalized fields
    milestone = task.milestone
    tr = TaskRead.model_validate(task)
    try:
        tr.milestone_slug = milestone.slug if milestone else None
        tr.project_id = milestone.project_id if milestone else None
    except Exception:
        # If relationship not loaded, leave as None
        pass
    return tr



def _find_milestone_by_project_and_slug(db: Session, project_id: UUID, milestone_slug: str) -> Milestone | None:
    return (
        db.query(Milestone)
        .filter(Milestone.project_id == project_id)
        .filter(Milestone.slug == milestone_slug)
        .first()
    )


@router.post(":upsert", response_model=TaskRead)
def upsert_task(payload: TaskUpsertPayload, response: Response, db: Session = Depends(get_session)) -> TaskRead:
    # Resolve milestone
    milestone: Milestone | None = None
    if payload.milestone_id:
        milestone = db.get(Milestone, payload.milestone_id)
        if milestone is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unknown milestone_id")
    elif payload.project_id and payload.milestone_slug:
        milestone = _find_milestone_by_project_and_slug(db, payload.project_id, payload.milestone_slug)
        if milestone is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unknown milestone_slug")
    else:
        # project_slug not implemented yet
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Must provide milestone_id or (project_id and milestone_slug)")

    # Upsert by external_id if provided
    task: Task | None = None
    created = False
    if payload.external_id:
        task = db.query(Task).filter(Task.external_id == payload.external_id).first()
        if task and task.milestone_id != milestone.id:
            # conflicting reassignment
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Conflicting external_id assignment")

    if task is None and payload.slug:
        task = (
            db.query(Task)
            .filter(Task.milestone_id == milestone.id)
            .filter(Task.slug == payload.slug)
            .first()
        )

    if task is None:
        # Create
        created = True
        task = Task(
            milestone_id=milestone.id,
            title=payload.title,
            description=payload.description,
            assignee_persona=payload.assignee_persona,
            effort_estimate=payload.effort_estimate or 0,
            priority_score=payload.priority_score or 0,
            external_id=payload.external_id,
            slug=payload.slug,
            parent_task_id=payload.parent_task_id,
        )
        # initial status option
        if isinstance(payload.options, dict) and payload.options.get("initial_status"):
            task.status = payload.options["initial_status"]
        db.add(task)
    else:
        # Update a few fields
        if payload.title is not None:
            task.title = payload.title
        if payload.description is not None:
            task.description = payload.description
        if payload.assignee_persona is not None:
            task.assignee_persona = payload.assignee_persona
        if payload.effort_estimate is not None:
            task.effort_estimate = payload.effort_estimate
        if payload.priority_score is not None:
            task.priority_score = payload.priority_score
        if payload.slug is not None:
            task.slug = payload.slug
        if payload.parent_task_id is not None:
            _ensure_parent_task(db, payload.parent_task_id)
            task.parent_task_id = payload.parent_task_id

    db.commit()
    db.refresh(task)

    response.headers["Location"] = f"/v1/tasks/{task.id}"
    response.headers["ETag"] = _weak_etag_for(task)
    if created:
        response.status_code = status.HTTP_201_CREATED
    return TaskRead.model_validate(task)


@router.get("/resolve", response_model=TaskRead)
def resolve_task(
    external_id: Optional[str] = None,
    project_id: Optional[UUID] = None,
    milestone_slug: Optional[str] = None,
    task_slug: Optional[str] = None,
    db: Session = Depends(get_session),
) -> TaskRead:
    task: Task | None = None
    if external_id:
        task = db.query(Task).filter(Task.external_id == external_id).first()
    elif project_id and milestone_slug and task_slug:
        milestone = _find_milestone_by_project_and_slug(db, project_id, milestone_slug)
        if milestone is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found")
        task = (
            db.query(Task)
            .filter(Task.milestone_id == milestone.id)
            .filter(Task.slug == task_slug)
            .first()
        )
    else:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Provide external_id or (project_id,milestone_slug,task_slug)")

    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return TaskRead.model_validate(task)


@router.patch("/{task_id}/status", response_model=TaskRead)
def update_task_status(task_id: UUID, payload: TaskStatusUpdate, response: Response, db: Session = Depends(get_session)) -> TaskRead:
    task = db.get(Task, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    if payload.lock_version is not None and task.lock_version != payload.lock_version:
        current = _as_task_read(task)
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"error": "conflict", "lock_version": task.lock_version, "task": current.model_dump()}
        )

    task.status = payload.status
    task.lock_version += 1
    db.commit()
    db.refresh(task)
    response.headers["ETag"] = _weak_etag_for(task)
    return _as_task_read(task)


@router.patch("/by-external/{external_id}/status", response_model=TaskRead)
def update_task_status_by_external_id(
    external_id: str, payload: TaskStatusUpdate, response: Response, db: Session = Depends(get_session)
) -> TaskRead:
    task = db.query(Task).filter(Task.external_id == external_id).first()
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    if payload.lock_version is not None and task.lock_version != payload.lock_version:
        # For this endpoint the proposal returns TaskRead on 409
        current = _as_task_read(task)
        return JSONResponse(status_code=status.HTTP_409_CONFLICT, content=current.model_dump())
    task.status = payload.status
    task.lock_version += 1
    db.commit()
    db.refresh(task)
    response.headers["ETag"] = _weak_etag_for(task)
    return _as_task_read(task)


@router.post("/status:batch", response_model=list[BatchStatusResult])
def batch_update_status(items: list[BatchStatusItem], db: Session = Depends(get_session)) -> list[BatchStatusResult]:
    results: list[BatchStatusResult] = []
    for item in items:
        try:
            task: Task | None = None
            if item.id:
                task = db.get(Task, item.id)
            elif item.external_id:
                task = db.query(Task).filter(Task.external_id == item.external_id).first()
            else:
                results.append(BatchStatusResult(ok=False, id=None, external_id=None, status=422, error="missing identifier"))
                continue

            if task is None:
                results.append(
                    BatchStatusResult(ok=False, id=item.id, external_id=item.external_id, status=404, error="not found")
                )
                continue
            if item.lock_version is not None and task.lock_version != item.lock_version:
                results.append(
                    BatchStatusResult(
                        ok=False,
                        id=str(task.id),
                        external_id=task.external_id,
                        status=409,
                        lock_version=task.lock_version,
                        error="conflict",
                    )
                )
                continue

            task.status = item.status
            task.lock_version += 1
            db.add(task)
            db.flush()

            results.append(
                BatchStatusResult(
                    ok=True, id=str(task.id), external_id=task.external_id, status=200, lock_version=task.lock_version
                )
            )
        except Exception as e:  # pragma: no cover - defensive catch
            results.append(
                BatchStatusResult(
                    ok=False, id=item.id, external_id=item.external_id, status=500, error=str(e), lock_version=None
                )
            )

    db.commit()
    return results
