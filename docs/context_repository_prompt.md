# Implement “Context Repository” in `agent-dashboard`

You are coding in the `agent-dashboard` project with:
- Python API under `api/`
- Web under `web/`
- Alembic migrations under `api/alembic/versions/`
(and routes/schemas/models consistent with current structure).

## Goal
Add a **Context Repository** service that stores and serves project context artifacts created by the machine-client **Context** agent:
- **Artifacts** (per repo):  
  - `snapshot.json` (diffable, small)  
  - `summary.md` (human summary; model write-up)  
  - `files.ndjson` (large file listing; not committed to Git)  
- **APIs** for upsert/get/list of contexts by **repo_id** (and optional branch/workflow tags).
- **Storage**: filesystem under repo root `.ma/context/` (authoritative), with DB metadata for indexing and retrieval.

> Compatibility: The machine-client already writes these files to `<REPO_ROOT>/.ma/context/…`. We must expose APIs that the coordinator/agents can call, and index metadata so the dashboard can render the latest context quickly.

---

## Acceptance Criteria
1. **DB schema** (Alembic migration) adds tables:
   - `context_snapshot`  
     ```
     id (PK), repo_id (text, index), branch (text, nullable),
     workflow_id (text, nullable), created_at (datetime, default=now),
     snapshot_path (text), summary_path (text), files_ndjson_path (text, nullable),
     totals_files (int), totals_bytes (bigint), totals_lines (int),
     components_json (jsonb/text), hotspots_json (jsonb/text)
     ```
   - `context_index` (optional for faster latest lookup)  
     ```
     repo_id (PK), latest_snapshot_id (FK->context_snapshot.id), updated_at
     ```
2. **Routes** under `api/app/routes/context.py`:
   - `POST /context/upsert` — accepts JSON with repo metadata + absolute repo path (or a repository key) and either:
     - direct **artifact payloads** (`snapshot` JSON, `summary` string, optional `files_ndjson` as text), **or**
     - **pointers** to files already written on disk by the machine-client (`.ma/context/...`).
   - `GET /context/latest?repo_id=…[&branch=…]` — returns latest metadata and **streams** or **reads** `snapshot.json` + `summary.md` (optionally head/tail of `files.ndjson`).
   - `GET /context/list?repo_id=…` — paginated list of historical snapshots (ids, timestamps, totals).
3. **Service layer** `api/app/services/context_repo.py` with functions:
   - `resolve_repo_root(repo_id: str) -> Path`
   - `write_artifacts(repo_root, snapshot, summary, files_ndjson?)`
   - `record_snapshot(metadata…) -> context_snapshot.id`
   - `load_latest(repo_id, branch?)`
4. **Security & limits**
   - Only allow `.json`, `.md`, `.ndjson`.
   - Size caps via env vars: `CTX_SUMMARY_MAX`, `CTX_SNAPSHOT_MAX`, `CTX_NDJSON_MAX`.
   - Path traversal safe-guards: joined paths must be under `repo_root`.
5. **Dashboard integration**
   - Render latest `summary.md` and totals from `snapshot.json`.
   - Allow `files.ndjson` download on-demand.

---

## File Changes (create/modify)

**Routes**
- `api/app/routes/context.py`

**Schemas**
- `api/app/schemas/context.py`

**Service**
- `api/app/services/context_repo.py`

**Models**
- Add `ContextSnapshot` & `ContextIndex`

**Alembic Migration**
- Create the two tables above

**Wiring**
- Register new router

---

## Env Config (new)
```
CTX_SUMMARY_MAX=2000000
CTX_SNAPSHOT_MAX=5000000
CTX_NDJSON_MAX=100000000
CTX_NDJSON_HEAD=200
```

---

## HTTP Contracts (examples)

**Upsert using pointers**
```bash
curl -X POST http://localhost:8000/context/upsert   -H "Content-Type: application/json"   -d '{"repo_id":"agent-dashboard","pointers":{"repo_root":"/mnt/e/code/agent-dashboard"}}'
```

**Get latest**
```bash
curl "http://localhost:8000/context/latest?repo_id=agent-dashboard"
```

**List**
```bash
curl "http://localhost:8000/context/list?repo_id=agent-dashboard&limit=20"
```
