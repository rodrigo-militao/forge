CREATE TABLE ideas (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT        NOT NULL,
    context    TEXT,
    notes      TEXT,
    "references" TEXT,
    priority   TEXT        NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    status     TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'used', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE idea_tags (
    tag_id  UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    PRIMARY KEY (tag_id, idea_id)
);

CREATE TABLE idea_articles (
    idea_id    UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    content_id UUID NOT NULL REFERENCES generated_content(id) ON DELETE CASCADE,
    PRIMARY KEY (idea_id, content_id)
);
