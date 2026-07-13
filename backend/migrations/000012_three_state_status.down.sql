-- Revert three-state status back to previous constraints.

-- ============================================================
-- generated_content: revert to 'draft' | 'approved' | 'rejected'
-- ============================================================
ALTER TABLE generated_content DROP CONSTRAINT IF EXISTS generated_content_status_check;
UPDATE generated_content SET status = 'approved' WHERE status = 'published';
UPDATE generated_content SET status = 'rejected' WHERE status = 'discarded';
ALTER TABLE generated_content ADD CONSTRAINT generated_content_status_check
    CHECK (status IN ('draft', 'approved', 'rejected'));

-- ============================================================
-- newsletter_editions: revert to 'draft' | 'exported'
-- ============================================================
ALTER TABLE newsletter_editions DROP CONSTRAINT IF EXISTS newsletter_editions_status_check;
UPDATE newsletter_editions SET status = 'exported' WHERE status = 'published';
UPDATE newsletter_editions SET status = 'draft' WHERE status = 'discarded';
ALTER TABLE newsletter_editions ADD CONSTRAINT newsletter_editions_status_check
    CHECK (status IN ('draft', 'exported'));
