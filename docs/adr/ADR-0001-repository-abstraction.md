# ADR-0001: Repository Abstraction for Domain Entities

Date: 2025-09-20
Status: Accepted
Decision Makers: Architect, Dev

## Context
Early Phase 1 implementation used in-file `Map` collections (`tasks`, `bugs`) directly inside the HTTP layer. As we move toward Phase 3 (persistence & role guardrails) we need a seam to:
- Swap in a durable store (SQLite/Postgres) without rewriting route logic.
- Centralize cross-cutting concerns (version checks, future caching, metrics hooks).
- Facilitate unit testing of business logic independent from transport.

## Decision
Introduce per-aggregate repository interfaces (`TaskRepository`, `BugRepository`) with current in-memory implementations. HTTP handlers depend only on these interfaces. Domain mutations (create, transition, list) go through repositories (except audit log which remains append-only in memory for now).

## Options Considered
1. Direct Maps (keep): Fast, but tightly couples transport to storage.
2. ORM-first (Prisma/TypeORM now): Premature; adds complexity before persistence is required.
3. Light repository interfaces (chosen): Minimal overhead; future adapter can conform.

## Consequences
Positive:
- Enables incremental migration to persistence (adapter swap) with low churn.
- Clear test seam (mock repository for edge cases if needed).
- Simplifies future instrumentation (wrap repository methods).

Negative:
- Slight upfront code (interfaces + wiring).
- Potential over-abstraction if scope stayed tiny (considered low risk given roadmap).

## Implementation Notes
- Interfaces in `backend/src/repositories/*Repository.ts`.
- Current ID generation remains in repository for creation (could move to service layer later).
- Server imports `InMemoryTaskRepository` & `InMemoryBugRepository` and exposes them for potential diagnostic use.

## Future Evolution
- Add `findByStatus`, pagination support.
- Introduce `saveAll` / bulk operations if needed for batch updates.
- Wrap with metrics decorator in Phase 4.
- Persistence adapter will implement the same interfaces; add migration ADR when selected.

## Status Impact
Tasks P1-2 / P1-3 partially satisfied (in-memory portion done; will mark complete when additional methods or persistence concerns arise). Plan updated accordingly.

---
