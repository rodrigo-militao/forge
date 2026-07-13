-- Replace newsletter_edition_items with newsletter_articles (many-to-many, ADR 0043).

CREATE TABLE newsletter_articles (
    newsletter_id      UUID NOT NULL REFERENCES newsletter_editions(id) ON DELETE CASCADE,
    digest_article_id  UUID NOT NULL REFERENCES generated_content(id) ON DELETE CASCADE,
    added_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (newsletter_id, digest_article_id)
);

CREATE INDEX idx_na_newsletter_id ON newsletter_articles(newsletter_id);

-- Migrate existing data from the old one-to-many table.
INSERT INTO newsletter_articles (newsletter_id, digest_article_id, added_at)
SELECT nei.edition_id, nei.content_id, nei.created_at
FROM newsletter_edition_items nei;

DROP TABLE newsletter_edition_items;
