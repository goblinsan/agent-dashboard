-- Soft delete support: add deleted_at columns.
ALTER TABLE tasks ADD COLUMN deleted_at INTEGER;
ALTER TABLE bugs ADD COLUMN deleted_at INTEGER;
ALTER TABLE design_notes ADD COLUMN deleted_at INTEGER;
