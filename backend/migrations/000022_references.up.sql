-- Sprint 3: References Foundation.
-- Adds "references" table and junction tables to link references
-- with ideas and generated_content (articles).
--
-- "references" is a PostgreSQL reserved word; the table name is
-- always double-quoted in SQL and aliased in queries.

-- ============================================================
-- "references" table
-- ============================================================
CREATE TABLE IF NOT EXISTS "references" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    source_name TEXT,
    reference_type TEXT NOT NULL DEFAULT 'website'
        CHECK (reference_type IN ('article', 'video', 'podcast', 'social_post', 'document', 'website', 'other')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_references_user_id ON "references"(user_id);

-- ============================================================
-- idea_references junction table
-- ============================================================
CREATE TABLE IF NOT EXISTS idea_references (
    idea_id UUID NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
    reference_id UUID NOT NULL REFERENCES "references"(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (idea_id, reference_id)
);

CREATE INDEX idx_idea_references_idea_id ON idea_references(idea_id);
CREATE INDEX idx_idea_references_reference_id ON idea_references(reference_id);

-- ============================================================
-- content_references junction table
-- ============================================================
CREATE TABLE IF NOT EXISTS content_references (
    content_id UUID NOT NULL REFERENCES generated_content(id) ON DELETE CASCADE,
    reference_id UUID NOT NULL REFERENCES "references"(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (content_id, reference_id)
);

CREATE INDEX idx_content_references_content_id ON content_references(content_id);
CREATE INDEX idx_content_references_reference_id ON content_references(reference_id);
