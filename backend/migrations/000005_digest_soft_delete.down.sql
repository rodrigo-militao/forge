-- Revert: drop deleted_at column (data is preserved but column removed).
-- The migration already transformed rejected→deleted, so going down
-- does NOT restore the old status — that's a one-way data migration.
ALTER TABLE generated_content DROP COLUMN deleted_at;
