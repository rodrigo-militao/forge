-- ADR 0046: Newsletter release model — building/ready/published/archived status,
-- destination field, duplicate support.
-- Remap old values: draft → building, discarded → archived.

ALTER TABLE newsletter_editions ADD COLUMN destination TEXT;

ALTER TABLE newsletter_editions DROP CONSTRAINT IF EXISTS newsletter_editions_status_check;
UPDATE newsletter_editions SET status = 'building' WHERE status = 'draft';
UPDATE newsletter_editions SET status = 'archived' WHERE status = 'discarded';
ALTER TABLE newsletter_editions ADD CONSTRAINT newsletter_editions_status_check
    CHECK (status IN ('building', 'ready', 'published', 'archived'));

ALTER TABLE newsletter_editions ALTER COLUMN status SET DEFAULT 'building';
