from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import Project, Milestone
from app.schemas import (
    ProjectCreate,
    ProjectRead,
    ProjectStatusRead,
    ProjectNextActions,
    ProjectStatusSummary,
    ProjectUpdate,
    MilestoneUpdate,
    MilestoneRead,
)
from app.project_services import compute_project_status, select_next_actions, generate_project_summary
from typing import List


def _slugify(text: str) -> str:
    # simple slugify: lower, replace non-alphanum with '-', collapse dashes
    import re

    s = text.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s

router = APIRouter(prefix="/v1/projects", tags=["projects"])


@router.post("", response_model=ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(payload: ProjectCreate, db: Session = Depends(get_session)) -> ProjectRead:
    project = Project(**payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return ProjectRead.model_validate(project)


@router.get("", response_model=list[ProjectRead])
def list_projects(parent_id: Optional[UUID] = None, db: Session = Depends(get_session)) -> list[ProjectRead]:
    query = db.query(Project)
    if parent_id:
        query = query.filter(Project.parent_id == parent_id)
    projects = query.order_by(Project.created_at.asc()).all()
    return [ProjectRead.model_validate(project) for project in projects]


@router.get("/{project_id}", response_model=ProjectRead)
def get_project(project_id: UUID, db: Session = Depends(get_session)) -> ProjectRead:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return ProjectRead.model_validate(project)


@router.patch("/{project_id}", response_model=ProjectRead)
def update_project(project_id: UUID, payload: ProjectUpdate, db: Session = Depends(get_session)) -> ProjectRead:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    return ProjectRead.model_validate(project)


@router.get("/{project_id}/status", response_model=ProjectStatusRead)
def get_project_status(project_id: UUID, db: Session = Depends(get_session)) -> ProjectStatusRead:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    status_summary = compute_project_status(db, project)
    return ProjectStatusRead(
        project_id=status_summary.project_id,
        total_estimate=round(status_summary.total_estimate, 2),
        remaining_effort=round(status_summary.remaining_effort, 2),
        percent_complete=round(status_summary.percent_complete, 2),
        status_breakdown=status_summary.status_breakdown,
        milestones=[
            {
                "milestone_id": milestone.milestone_id,
                "name": milestone.milestone_name,
                "total_estimate": round(milestone.total_estimate, 2),
                "remaining_effort": round(milestone.remaining_effort, 2),
                "percent_complete": round(milestone.percent_complete, 2),
            }
            for milestone in status_summary.milestone_summaries
        ],
    )


@router.get("/{project_id}/next-action", response_model=ProjectNextActions)
def get_project_next_actions(project_id: UUID, db: Session = Depends(get_session)) -> ProjectNextActions:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    suggestions = select_next_actions(db, project)
    return ProjectNextActions(
        project_id=project.id,
        suggestions=[
            {
                "task_id": suggestion.task_id,
                "title": suggestion.title,
                "status": suggestion.status,
                "persona_required": suggestion.persona_required,
                "priority_score": suggestion.priority_score,
                "reason": suggestion.reason,
            }
            for suggestion in suggestions
        ],
    )


@router.get("/{project_id}/status/summary", response_model=ProjectStatusSummary)
def get_project_status_summary(project_id: UUID, db: Session = Depends(get_session)) -> ProjectStatusSummary:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    summary = generate_project_summary(db, project)
    return ProjectStatusSummary(
        project_id=summary.project_id,
        summary=summary.summary,
        generated_at=summary.generated_at,
    )

@router.get("/{project_id}/milestones")
def find_milestones_by_slug_or_name(
    project_id: UUID,
    slug: Optional[str] = None,
    name: Optional[str] = None,
    limit: int = 10,
    db: Session = Depends(get_session),
) -> dict:
    """Resolve milestones for a project by slug or name.

    Returns JSON: {"ok": true, "milestones": [ {id, slug, name, start_date, due_date, url}, ... ]}
    """
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    query = db.query(Milestone).filter(Milestone.project_id == project_id)
    milestones: List[Milestone] = query.order_by(Milestone.created_at.asc()).all()

    results: List[dict] = []
    for m in milestones:
        # Prefer stored slug, fallback to slugified name for legacy records
        mslug = (m.slug or _slugify(m.name or ""))
        if slug:
            if mslug == slug.lower():
                results.append({
                    "id": str(m.id),
                    "slug": mslug,
                    "name": m.name,
                    "start_date": m.start_date.isoformat() if m.start_date else None,
                    "due_date": m.due_date.isoformat() if m.due_date else None,
                    "url": f"/v1/milestones/{m.id}",
                })
        elif name:
            if (m.name or "").lower().find(name.lower()) != -1:
                results.append({
                    "id": str(m.id),
                    "slug": mslug,
                    "name": m.name,
                    "start_date": m.start_date.isoformat() if m.start_date else None,
                    "due_date": m.due_date.isoformat() if m.due_date else None,
                    "url": f"/v1/milestones/{m.id}",
                })
        else:
            results.append({
                "id": str(m.id),
                "slug": mslug,
                "name": m.name,
                "start_date": m.start_date.isoformat() if m.start_date else None,
                "due_date": m.due_date.isoformat() if m.due_date else None,
                "url": f"/v1/milestones/{m.id}",
            })

    # apply limit
    results = results[: max(1, min(limit, len(results)))] if results else []

    return {"ok": True, "milestones": results}

# Upsert milestone by slug within a project: POST /v1/projects/{project_id}/milestones:upsert
@router.post("/{project_id}/milestones:upsert", response_model=MilestoneRead)
def upsert_milestone(
    project_id: UUID,
    payload: MilestoneUpdate,
    db: Session = Depends(get_session),
    response: Response = None,
) -> MilestoneRead:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    data = payload.model_dump(exclude_unset=True)
    slug = data.get("slug")
    if not slug:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="slug required")
    milestone = db.query(Milestone).filter(Milestone.project_id == project_id, Milestone.slug == slug).first()
    if milestone is None:
        milestone = Milestone(project_id=project_id, slug=slug, name=data.get("name") or slug)
        for f in ["start_date", "due_date"]:
            if f in data:
                setattr(milestone, f, data[f])
        db.add(milestone)
        db.commit()
        db.refresh(milestone)
        if response is not None:
            response.status_code = status.HTTP_201_CREATED
            response.headers["Location"] = f"/v1/milestones/{milestone.id}"
        return MilestoneRead.model_validate(milestone)
    else:
        for f in ["name", "start_date", "due_date"]:
            if f in data and data[f] is not None:
                setattr(milestone, f, data[f])
        db.commit()
        db.refresh(milestone)
        return MilestoneRead.model_validate(milestone)
