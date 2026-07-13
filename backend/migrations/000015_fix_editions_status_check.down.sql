ALTER TABLE newsletter_editions DROP CONSTRAINT IF EXISTS newsletter_editions_status_check;
UPDATE newsletter_editions SET status = 'exported' WHERE status = 'published';
ALTER TABLE newsletter_editions ADD CONSTRAINT newsletter_editions_status_check
    CHECK (status IN ('draft', 'exported'));
