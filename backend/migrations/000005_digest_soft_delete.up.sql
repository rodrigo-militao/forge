ALTER TABLE generated_content ADD COLUMN deleted_at TIMESTAMPTZ;

-- Migrate existing data: rejected digest items become soft-deleted,
-- approved/pending ones remain visible.
UPDATE generated_content
SET deleted_at = now()
WHERE product = 'digest' AND status = 'rejected';
