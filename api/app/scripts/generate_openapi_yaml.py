"""Utility to export the FastAPI OpenAPI spec to YAML."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("DATABASE_URL", "sqlite:///./openapi-schema.db")
os.environ.setdefault("SQL_ECHO", "false")

from app.main import app
from app import schemas as app_schemas
from pydantic import BaseModel


def rebuild_models() -> None:
    for attr in vars(app_schemas).values():
        if isinstance(attr, type) and issubclass(attr, BaseModel):
            try:
                attr.model_rebuild(force=True)
            except Exception:
                pass


def format_scalar(value: object) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return json.dumps(value)
    return json.dumps(str(value))


def dump_yaml(value: object, indent: int = 0) -> str:
    space = " " * indent
    if isinstance(value, dict):
        if not value:
            return space + "{}"
        parts: list[str] = []
        for key, val in value.items():
            key_str = str(key)
            if isinstance(val, (dict, list)):
                parts.append(f"{space}{key_str}:")
                parts.append(dump_yaml(val, indent + 2))
            else:
                parts.append(f"{space}{key_str}: {format_scalar(val)}")
        return "\n".join(parts)
    if isinstance(value, list):
        if not value:
            return space + "[]"
        parts: list[str] = []
        for item in value:
            if isinstance(item, (dict, list)):
                parts.append(f"{space}-")
                parts.append(dump_yaml(item, indent + 2))
            else:
                parts.append(f"{space}- {format_scalar(item)}")
        return "\n".join(parts)
    return space + format_scalar(value)


def export_openapi(target_path: Path) -> None:
    rebuild_models()
    schema = app.openapi()

    try:
        import yaml as py_yaml  # type: ignore
    except ModuleNotFoundError:
        py_yaml = None  # type: ignore

    if py_yaml is not None:
        content = py_yaml.safe_dump(schema, sort_keys=False)
    else:
        content = dump_yaml(schema)

    target_path.write_text(content, encoding="utf-8")


if __name__ == "__main__":
    target = Path(__file__).resolve().parents[1] / "openapi.yml"
    export_openapi(target)
    print(f"Wrote OpenAPI schema to {target}")
