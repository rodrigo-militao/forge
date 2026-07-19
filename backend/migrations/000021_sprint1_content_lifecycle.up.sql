-- Sprint 1: Add content_type and published_at to generated_content.
-- Evolve status: draft → building. Add review and ready to both
-- generated_content and newsletter_editions CHECK constraints.
--
-- See ADR [TBD] for lifecycle rules.

-- ============================================================
-- generated_content: add content_type column
-- ============================================================
ALTER TABLE generated_content ADD COLUMN content_type TEXT NOT NULL DEFAULT 'article'
    CHECK (content_type IN ('article', 'newsletter'));

-- ============================================================
-- generated_content: add published_at column (set when status
-- transitions to published)
-- ============================================================
ALTER TABLE generated_content ADD COLUMN published_at TIMESTAMPTZ;

-- ============================================================
-- generated_content: evolve status CHECK constraint
-- Old: draft | published | discarded
-- New: building | review | ready | published | discarded
-- discarded is kept for existing data — it is not a forward
-- transition target in the Sprint 1 lifecycle.
-- ============================================================
ALTER TABLE generated_content DROP CONSTRAINT IF EXISTS generated_content_status_check;
UPDATE generated_content SET status = 'building' WHERE status = 'draft';
ALTER TABLE generated_content ADD CONSTRAINT generated_content_status_check
    CHECK (status IN ('building', 'review', 'ready', 'published', 'discarded'));

-- ============================================================
-- newsletter_editions: evolve status CHECK constraint
-- Old: building | ready | published | archived
-- New: building | review | ready | published | archived
-- ============================================================
ALTER TABLE newsletter_editions DROP CONSTRAINT IF EXISTS newsletter_editions_status_check;
ALTER TABLE newsletter_editions ADD CONSTRAINT newsletter_editions_status_check
    CHECK (status IN ('building', 'review', 'ready', 'published', 'archived'));
