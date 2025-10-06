from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import Milestone, Project
from app.schemas import MilestoneCreate, MilestoneRead, MilestoneUpdate

router = APIRouter(prefix="/v1/milestones", tags=["milestones"])


@router.post("", response_model=MilestoneRead, status_code=status.HTTP_201_CREATED)
def create_milestone(payload: MilestoneCreate, db: Session = Depends(get_session)) -> MilestoneRead:
    project = db.get(Project, payload.project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project not found")

    milestone = Milestone(**payload.model_dump())
    db.add(milestone)
    db.commit()
    db.refresh(milestone)
    return MilestoneRead.model_validate(milestone)


    


@router.get("", response_model=list[MilestoneRead])
def list_milestones(project_id: Optional[UUID] = None, db: Session = Depends(get_session)) -> list[MilestoneRead]:
    query = db.query(Milestone)
    if project_id:
        query = query.filter(Milestone.project_id == project_id)
    milestones = query.order_by(Milestone.created_at.asc()).all()
    return [MilestoneRead.model_validate(milestone) for milestone in milestones]


@router.get("/{milestone_id}", response_model=MilestoneRead)
def get_milestone(milestone_id: UUID, db: Session = Depends(get_session)) -> MilestoneRead:
    milestone = db.get(Milestone, milestone_id)
    if milestone is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found")
    return MilestoneRead.model_validate(milestone)


@router.patch("/{milestone_id}", response_model=MilestoneRead)
def update_milestone(milestone_id: UUID, payload: MilestoneUpdate, db: Session = Depends(get_session)) -> MilestoneRead:
    milestone = db.get(Milestone, milestone_id)
    if milestone is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Milestone not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(milestone, field, value)

    db.commit()
    db.refresh(milestone)
    return MilestoneRead.model_validate(milestone)
