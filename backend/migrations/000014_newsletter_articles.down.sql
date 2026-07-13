-- Restore newsletter_edition_items from newsletter_articles (approximate data loss).

CREATE TABLE newsletter_edition_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edition_id  UUID NOT NULL REFERENCES newsletter_editions(id) ON DELETE CASCADE,
    content_id  UUID NOT NULL REFERENCES generated_content(id) ON DELETE CASCADE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(edition_id, content_id)
);

INSERT INTO newsletter_edition_items (edition_id, content_id, sort_order, created_at)
SELECT newsletter_id, digest_article_id, 0, added_at
FROM newsletter_articles;

DROP TABLE newsletter_articles;
