-- Digest interests: topics/keywords the user wants to curate (ADR 0032).
-- Separate from `topics` (Compose's topic generator).
CREATE TABLE digest_interests (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label      TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_digest_interests_user_id ON digest_interests(user_id);
