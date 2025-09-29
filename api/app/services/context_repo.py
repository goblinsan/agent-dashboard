import os
from pathlib import Path
from typing import Optional, Any
from datetime import datetime
from sqlalchemy.orm import Session
from app.models import ContextSnapshot, ContextIndex
from app.schemas import ContextSnapshotCreate

class ContextRepoService:
    @staticmethod
    def resolve_repo_root(repo_id: str) -> Path:
        # This should resolve the repo root based on repo_id
        # For now, assume a base path from env or config
        base_path = os.environ.get("REPO_BASE_PATH", "/mnt/e/code")
        repo_root = Path(base_path) / repo_id
        return repo_root.resolve()

    @staticmethod
    def write_artifacts(repo_root: Path, snapshot: dict, summary: str, files_ndjson: Optional[str] = None) -> dict:
        context_dir = repo_root / ".ma" / "context"
        context_dir.mkdir(parents=True, exist_ok=True)
        now = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        snapshot_path = context_dir / f"snapshot_{now}.json"
        summary_path = context_dir / f"summary_{now}.md"
        files_ndjson_path = context_dir / f"files_{now}.ndjson" if files_ndjson else None
        # Write files
        snapshot_path.write_text(json.dumps(snapshot), encoding="utf-8")
        summary_path.write_text(summary, encoding="utf-8")
        if files_ndjson and files_ndjson_path:
            files_ndjson_path.write_text(files_ndjson, encoding="utf-8")
        return {
            "snapshot_path": str(snapshot_path),
            "summary_path": str(summary_path),
            "files_ndjson_path": str(files_ndjson_path) if files_ndjson_path else None
        }

    @staticmethod
    def record_snapshot(db: Session, data: ContextSnapshotCreate) -> int:
        snapshot = ContextSnapshot(**data.dict())
        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)
        # Optionally update ContextIndex
        index = db.query(ContextIndex).filter_by(repo_id=snapshot.repo_id).first()
        if not index:
            index = ContextIndex(repo_id=snapshot.repo_id, latest_snapshot_id=snapshot.id, updated_at=datetime.utcnow())
            db.add(index)
        else:
            index.latest_snapshot_id = snapshot.id
            index.updated_at = datetime.utcnow()
        db.commit()
        return snapshot.id

    @staticmethod
    def load_latest(db: Session, repo_id: str, branch: Optional[str] = None) -> Optional[ContextSnapshot]:
        query = db.query(ContextSnapshot).filter_by(repo_id=repo_id)
        if branch:
            query = query.filter_by(branch=branch)
        return query.order_by(ContextSnapshot.created_at.desc()).first()
