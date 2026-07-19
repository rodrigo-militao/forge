-- Sprint 1 rollback: revert content lifecycle changes.
--
-- NOTE: This down migration is NOT fully semantically reversible.
-- The forward migration maps draft → building, but the down migration
-- maps all Sprint 1 statuses (building, review, ready) → draft because
-- there is no reliable way to distinguish "was originally draft" from
-- "was always building" without a separate tracking column.
-- This is an accepted limitation — the down migration exists only for
-- structural rollback, not for perfect semantic reconstruction.

-- ============================================================
-- newsletter_editions: restore old CHECK constraint
-- ============================================================
ALTER TABLE newsletter_editions DROP CONSTRAINT IF EXISTS newsletter_editions_status_check;
ALTER TABLE newsletter_editions ADD CONSTRAINT newsletter_editions_status_check
    CHECK (status IN ('building', 'ready', 'published', 'archived'));

-- ============================================================
-- generated_content: restore old CHECK constraint
-- Map all Sprint 1 statuses back to draft
-- ============================================================
ALTER TABLE generated_content DROP CONSTRAINT IF EXISTS generated_content_status_check;
UPDATE generated_content SET status = 'draft' WHERE status IN ('building', 'review', 'ready');
ALTER TABLE generated_content ADD CONSTRAINT generated_content_status_check
    CHECK (status IN ('draft', 'published', 'discarded'));

-- ============================================================
-- generated_content: drop published_at
-- ============================================================
ALTER TABLE generated_content DROP COLUMN IF EXISTS published_at;

-- ============================================================
-- generated_content: drop content_type
-- ============================================================
ALTER TABLE generated_content DROP COLUMN IF EXISTS content_type;
