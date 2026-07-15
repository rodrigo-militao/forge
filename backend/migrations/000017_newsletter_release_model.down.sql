-- ADR 0046: rollback — revert status and remove destination column.

ALTER TABLE newsletter_editions DROP COLUMN destination;

ALTER TABLE newsletter_editions DROP CONSTRAINT IF EXISTS newsletter_editions_status_check;
UPDATE newsletter_editions SET status = 'draft' WHERE status = 'building';
UPDATE newsletter_editions SET status = 'discarded' WHERE status = 'archived';
ALTER TABLE newsletter_editions ADD CONSTRAINT newsletter_editions_status_check
    CHECK (status IN ('draft', 'published', 'discarded'));

ALTER TABLE newsletter_editions ALTER COLUMN status SET DEFAULT 'draft';
