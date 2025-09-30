import inspect

from fastapi import APIRouter
from pydantic import BaseModel

from app import schemas as app_schemas

router = APIRouter(prefix="/v1/.well-known", tags=["discovery"])


def _collect_schema_definitions() -> dict[str, dict[str, object]]:
    definitions: dict[str, dict[str, object]] = {}
    for name, attr in vars(app_schemas).items():
        if not inspect.isclass(attr) or not issubclass(attr, BaseModel):
            continue
        if attr.__module__ != app_schemas.__name__:
            continue
        try:
            attr.model_rebuild(force=True)
        except Exception:
            pass
        definitions[name] = attr.model_json_schema()
    return dict(sorted(definitions.items()))


@router.get("/schemas")
def list_schemas() -> dict[str, dict[str, object]]:
    return {
        "schemas": _collect_schema_definitions(),
    }


@router.get("/openapi")
def discover_openapi() -> dict[str, str]:
    return {"openapi_url": "/openapi.yml"}
