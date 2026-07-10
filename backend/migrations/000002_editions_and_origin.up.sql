-- Newsletter editions (ADR 0029)
-- An edition is a curated collection of approved digest items assembled
-- into a single editable document with an LLM-generated introduction.

CREATE TABLE newsletter_editions (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title        TEXT        NOT NULL DEFAULT '',
    introduction TEXT        NOT NULL DEFAULT '',
    status       TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'exported')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_editions_user_id ON newsletter_editions(user_id);

-- Items that compose an edition.
CREATE TABLE newsletter_edition_items (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    edition_id  UUID        NOT NULL REFERENCES newsletter_editions(id) ON DELETE CASCADE,
    content_id  UUID        NOT NULL REFERENCES generated_content(id) ON DELETE CASCADE,
    sort_order  INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (edition_id, content_id)
);

CREATE INDEX idx_edition_items_edition_id ON newsletter_edition_items(edition_id);

-- Track content origin (ADR 0030, optional but recommended).
ALTER TABLE generated_content
    ADD COLUMN origin TEXT NOT NULL DEFAULT 'ai_generated'
    CHECK (origin IN ('ai_generated', 'manual'));
