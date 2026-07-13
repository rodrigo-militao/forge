-- Extend newsletter_editions with category; add edition-tag junction (ADR 0042).

ALTER TABLE newsletter_editions ADD COLUMN category TEXT;

CREATE TABLE newsletter_edition_tags (
    edition_id UUID NOT NULL REFERENCES newsletter_editions(id) ON DELETE CASCADE,
    tag_id     UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (edition_id, tag_id)
);

CREATE INDEX idx_net_edition_id ON newsletter_edition_tags(edition_id);
