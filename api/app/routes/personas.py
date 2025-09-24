from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import Persona, Project, ProjectPersona
from app.schemas import (
    PersonaRead,
    ProjectPersonaRead,
    ProjectPersonaUpdatePayload,
)

router = APIRouter(prefix="/v1/personas", tags=["personas"])


@router.get("", response_model=List[PersonaRead])
def list_personas(db: Session = Depends(get_session)) -> list[PersonaRead]:
    personas = db.query(Persona).order_by(Persona.name.asc()).all()
    return [PersonaRead.model_validate(persona) for persona in personas]


@router.get("/projects/{project_id}", response_model=List[ProjectPersonaRead])
def list_project_personas(project_id: UUID, db: Session = Depends(get_session)) -> list[ProjectPersonaRead]:
    return _serialize_project_personas(db, project_id)


@router.put("/projects/{project_id}", response_model=List[ProjectPersonaRead])
def upsert_project_personas(
    project_id: UUID,
    payload: ProjectPersonaUpdatePayload,
    db: Session = Depends(get_session),
) -> list[ProjectPersonaRead]:
    if db.get(Project, project_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    assignments = payload.personas
    seen_keys: set[str] = set()
    for item in assignments:
        if item.persona_key in seen_keys:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Duplicate persona key in payload")
        seen_keys.add(item.persona_key)
        if db.get(Persona, item.persona_key) is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Persona '{item.persona_key}' not found",
            )

    existing = (
        db.query(ProjectPersona)
        .filter(ProjectPersona.project_id == project_id)
        .all()
    )
    existing_by_key = {record.persona_key: record for record in existing}

    # Remove personas no longer assigned
    for record in existing:
        if record.persona_key not in seen_keys:
            db.delete(record)

    for item in assignments:
        record = existing_by_key.get(item.persona_key)
        if record is None:
            db.add(
                ProjectPersona(
                    project_id=project_id,
                    persona_key=item.persona_key,
                    limit_per_agent=item.limit_per_agent,
                )
            )
        else:
            record.limit_per_agent = item.limit_per_agent

    db.commit()
    return _serialize_project_personas(db, project_id)


def _serialize_project_personas(db: Session, project_id: UUID) -> list[ProjectPersonaRead]:
    records = (
        db.query(ProjectPersona)
        .join(Persona)
        .filter(ProjectPersona.project_id == project_id)
        .order_by(Persona.name.asc())
        .all()
    )

    results: list[ProjectPersonaRead] = []
    for record in records:
        persona = PersonaRead.model_validate(record.persona)
        results.append(
            ProjectPersonaRead(
                project_id=record.project_id,
                persona_key=record.persona_key,
                limit_per_agent=record.limit_per_agent,
                persona=persona,
            )
        )
    return results
