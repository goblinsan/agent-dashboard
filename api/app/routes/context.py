from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.db import get_session
from app.services.context_repo import ContextRepoService
from app.schemas import ContextSnapshotCreate, ContextSnapshotRead
from app.models import ContextSnapshot, ContextIndex

router = APIRouter(prefix="/context", tags=["context"])

@router.post("/upsert", response_model=int)
def upsert_context(
    payload: ContextSnapshotCreate,
    db: Session = Depends(get_session)
) -> int:
    # This assumes direct artifact payloads; for pointers, extend as needed
    snapshot_id = ContextRepoService.record_snapshot(db, payload)
    return snapshot_id

@router.get("/latest", response_model=Optional[ContextSnapshotRead])
def get_latest_context(
    repo_id: str = Query(...),
    branch: Optional[str] = Query(None),
    db: Session = Depends(get_session)
) -> Optional[ContextSnapshotRead]:
    latest = ContextRepoService.load_latest(db, repo_id, branch)
    if not latest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No context found")
    return latest

@router.get("/list", response_model=list[ContextSnapshotRead])
def list_context_snapshots(
    repo_id: str = Query(...),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_session)
) -> list[ContextSnapshotRead]:
    query = db.query(ContextSnapshot).filter_by(repo_id=repo_id).order_by(ContextSnapshot.created_at.desc()).limit(limit)
    return query.all()

@router.get("/repos", response_model=list[str])
def list_repo_ids(db: Session = Depends(get_session)):
    repo_ids = db.query(ContextIndex.repo_id).all()
    return [r[0] for r in repo_ids]
