from __future__ import annotations

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_session
from app.models import Persona, ProjectPersona
from app.schemas import PersonaRead, ProjectPersonaRead

router = APIRouter(prefix="/v1/personas", tags=["personas"])


@router.get("", response_model=List[PersonaRead])
def list_personas(db: Session = Depends(get_session)) -> list[PersonaRead]:
    personas = db.query(Persona).order_by(Persona.name.asc()).all()
    return [PersonaRead.model_validate(persona) for persona in personas]


@router.get("/projects/{project_id}", response_model=List[ProjectPersonaRead])
def list_project_personas(project_id: UUID, db: Session = Depends(get_session)) -> list[ProjectPersonaRead]:
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
