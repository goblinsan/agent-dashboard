# ADR-0002: Audit Log Retention & Pruning Strategy

Date: 2025-09-20
Status: Accepted
Deciders: Dev, Architect

## Context
The audit log is currently kept fully in-memory for Phase 1 to maximize development speed. Without retention controls it can grow unbounded, increasing memory usage and degrading slice operations. We need a lightweight mechanism now that does not prematurely commit us to a persistence back-end before Phase 3.

## Decision
Introduce a configurable maximum number of audit entries (default 5000) enforced on every append. When the cap is exceeded, oldest entries are pruned (FIFO) until size == cap. The cap is controlled via environment variable `MAX_AUDIT_ENTRIES`.

## Rationale
- Simple, constant-time append plus bounded memory profile.
- Avoids complexity of time-based retention while volume is low.
- Easy to evolve to time+count policy later.
- Keeps API semantics stable (`/audit?limit=` still functions on most recent window).

## Alternatives Considered
1. Unlimited growth: Simpler but risks memory bloat.
2. Time-based expiration (e.g., >24h): Harder to test consistently; requires periodic sweeps.
3. External durable store now: Premature relative to Phase 3 schedule.

## Consequences
Positive:
- Predictable resource usage.
- Minimal code footprint.

Negative:
- Older history lost once cap reached.
- No per-actor filtering or advanced query yet.

## Future Evolution
- Add optional time horizon (e.g., drop entries older than X days) in addition to size.
- Persist to durable store (SQLite/Postgres) in Phase 3 with pagination & filtering.
- Consider streaming to append-only file or queue for replay.

## Status Impact
Addresses part of P1-11 (pagination already partially via `limit` param; pruning now implemented). Plan updated accordingly.

---
