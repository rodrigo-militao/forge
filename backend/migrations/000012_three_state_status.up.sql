-- Three-state status for generated_content and newsletter_editions (ADR 0044).
-- Remap old values: approved → published, exported → published.

-- ============================================================
-- generated_content: 'draft' | 'published' | 'discarded'
-- ============================================================
ALTER TABLE generated_content DROP CONSTRAINT IF EXISTS generated_content_status_check;
UPDATE generated_content SET status = 'published' WHERE status = 'approved';
ALTER TABLE generated_content ADD CONSTRAINT generated_content_status_check
    CHECK (status IN ('draft', 'published', 'discarded'));

-- ============================================================
-- newsletter_editions: 'draft' | 'published' | 'discarded'
-- ============================================================
ALTER TABLE newsletter_editions DROP CONSTRAINT IF EXISTS newsletter_editions_status_check;
UPDATE newsletter_editions SET status = 'published' WHERE status = 'exported';
ALTER TABLE newsletter_editions ADD CONSTRAINT newsletter_editions_status_check
    CHECK (status IN ('draft', 'published', 'discarded'));
