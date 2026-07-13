-- Fix newsletter_editions.status CHECK to match the three-state system (ADR 0044).
-- Migration 000012 updated generated_content.status but forgot to update
-- newsletter_editions.status — it still allows 'draft' | 'exported'.

ALTER TABLE newsletter_editions DROP CONSTRAINT IF EXISTS newsletter_editions_status_check;
UPDATE newsletter_editions SET status = 'published' WHERE status = 'exported';
ALTER TABLE newsletter_editions ADD CONSTRAINT newsletter_editions_status_check
    CHECK (status IN ('draft', 'published', 'discarded'));
