-- Migration 0005 (placeholder)
-- Objective: Enforce NOT NULL constraint on tasks.phase_id after backfill is confirmed.
-- Current State: Application guarantees assignment via startup backfill + default phase creation + auto-assignment on task creation.
-- Planned Steps (when executing real migration):
-- 1. Add temp check to verify no NULL phase_id rows remain.
-- 2. ALTER TABLE tasks ALTER COLUMN phase_id SET NOT NULL (SQLite requires table rebuild pattern).
-- 3. (Optional) Add foreign key constraint referencing phases(id) if not already enforced.
-- NOTE: This file is a placeholder to record intent; it performs no schema changes now.

-- No-op statement to keep migration runner satisfied if executed:
SELECT 1;