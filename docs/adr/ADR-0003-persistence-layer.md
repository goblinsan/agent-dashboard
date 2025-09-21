# ADR-0003: Initial Persistence Layer Strategy

Status: Draft
Date: 2025-09-21

## Context
Current repositories are in-memory only, which restricts durability, restarts, multi-process scaling, and historical audit retention beyond runtime. Phase 3 roadmap introduces persistence & role guardrails. We need a pragmatic, low-friction storage choice that:
- Works locally without external service setup (fast contributor onboarding)
- Supports relational-style querying for evolving domain (tasks, bugs, status updates, design notes, audit entries)
- Allows incremental migration to a more scalable database (e.g., PostgreSQL) later without rewriting all repository contracts
- Keeps operational overhead minimal at early stage

Constraints & goals:
- Keep repository abstraction intact (already established in ADR-0001) to isolate storage choice
- Avoid premature optimization (no immediate sharding/cluster needs)
- Enable adding indexes for read patterns (recent status updates, design notes ordered by creation time)
- Support basic concurrency control (optimistic version increments already used)

## Decision
Adopt SQLite (file-backed) as the initial persistence layer via a lightweight query/ORM toolkit (e.g., better-sqlite3 or Drizzle ORM over SQLite) while maintaining repository interfaces. Provide a compatibility migration path to PostgreSQL by:
1. Defining a minimal schema DDL expressed in a portable migration format (SQL files or migration tool that supports both dialects)
2. Avoiding vendor-specific extensions (e.g., JSONB, partial indexes) in early schema
3. Encapsulating DB access in repository implementations; no raw DB leakage into route handlers

## Alternatives Considered
- Continue In-Memory Only
  - Pros: Zero complexity, fastest iteration
  - Cons: Data loss on restart, blocks multi-instance, no durable audit history
- PostgreSQL First
  - Pros: Production-ready scaling, richer SQL features
  - Cons: Higher local setup friction, requires running service/containers for every contributor early
- Document Store (e.g., MongoDB)
  - Pros: Flexible schema evolution
  - Cons: Loses relational joins, adds modeling ambiguity, less natural for pagination of ordered event logs
- Embedded KV (e.g., LiteFS / Badger / Redis persistence)
  - Pros: Simple key-value semantics, speed
  - Cons: Requires additional modeling layer for queries, pagination, filtering

## Consequences
### Positive
- Fast local dev: single file DB, no external dependency
- Easy snapshotting / resetting test state (delete DB file)
- Maintains repository abstraction enabling future drop-in Postgres implementation
- Sufficient SQL features for indexing, constraints, and integrity

### Negative / Trade-offs
- Single-writer limitations can appear under heavy concurrent write load (acceptable early)
- Requires migration tooling work now (lightweight) to keep future path clean
- Potential performance tuning difference when later moving to PostgreSQL (query plans)

## Implementation Notes
Phased approach:
1. Introduce dependency (e.g., `better-sqlite3`) and a `db/` module initializing connection (singleton) with file path configurable via `PERSIST_DB_PATH` (default: `data/app.db`).
2. Add migration runner: simple table `schema_migrations(version TEXT PRIMARY KEY, applied_at INTEGER)`; execute numbered SQL files in `migrations/`.
3. Define initial tables: `tasks`, `bugs`, `status_updates`, `design_notes`, `audit_entries` including created timestamps and version columns where applicable.
4. Implement `SqliteTaskRepository` etc. matching existing method contracts; keep in-memory versions for fast tests (swap via env flag).
5. Add feature flag ENV `PERSISTENCE=sqlite|memory` controlling DI selection at server start.
6. Update tests to run against in-memory by default; add optional CI matrix job using SQLite to catch divergence.
7. Provide export/import script (JSON dump) for backup and manual migrations.

Schema hints (concise):
- tasks(id TEXT PK, title TEXT, status TEXT, version INTEGER, priority TEXT, rationale_log TEXT JSON, assignees TEXT JSON, created_at INTEGER)
- bugs(id TEXT PK, title TEXT, severity TEXT, task_id TEXT NULL, repro_steps TEXT JSON, proposed_fix TEXT NULL, version INTEGER, created_at INTEGER)
- status_updates(id TEXT PK, actor TEXT, task_id TEXT NULL, message TEXT, created_at INTEGER)
- design_notes(id TEXT PK, title TEXT, context TEXT, decision TEXT, consequences TEXT, actor TEXT, created_at INTEGER, superseded_by TEXT NULL)
- audit_entries(id TEXT PK, actor TEXT, entity TEXT, entity_id TEXT, action TEXT, at INTEGER, diff TEXT JSON)

## Follow-Up Tasks
- [ ] Add SQLite dependency & connection helper
- [ ] Create migration system & initial schema
- [ ] Implement SQLite repositories (parallel to in-memory)
- [ ] Add ENV feature flag & bootstrap selection
- [ ] Add CI job variant using SQLite
- [ ] Provide export/import script
- [ ] Update docs (README + PLAN) referencing persistence mode

## References
- ADR-0001 (Repository Abstraction)
- ADR-0002 (Audit Log Retention)
- Drizzle ORM docs (optional evaluation)
- better-sqlite3 performance notes
