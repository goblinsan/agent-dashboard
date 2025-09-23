from fastapi import APIRouter

from app.schemas import MilestoneCreate, ProjectCreate, TaskCreate

router = APIRouter(prefix="/v1/.well-known", tags=["discovery"])


@router.get("/schemas")
def list_schemas() -> dict[str, dict[str, object]]:
    return {
        "schemas": {
            "project": ProjectCreate.model_json_schema(),
            "milestone": MilestoneCreate.model_json_schema(),
            "task": TaskCreate.model_json_schema(),
        }
    }
