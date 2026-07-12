CREATE TABLE tags (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label      TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, label)
);
CREATE INDEX idx_tags_user_id ON tags(user_id);

CREATE TABLE digest_article_tags (
    tag_id     UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    article_id UUID NOT NULL REFERENCES generated_content(id) ON DELETE CASCADE,
    PRIMARY KEY (tag_id, article_id)
);
CREATE INDEX idx_digest_article_tags_article_id ON digest_article_tags(article_id);

CREATE TABLE content_tags (
    tag_id     UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    content_id UUID NOT NULL REFERENCES generated_content(id) ON DELETE CASCADE,
    PRIMARY KEY (tag_id, content_id)
);
CREATE INDEX idx_content_tags_content_id ON content_tags(content_id);

INSERT INTO tags (user_id, label)
SELECT DISTINCT gc.user_id, unnest(gc.tags) FROM generated_content gc
WHERE gc.tags IS NOT NULL AND gc.tags <> '{}'
ON CONFLICT (user_id, label) DO NOTHING;

INSERT INTO digest_article_tags (tag_id, article_id)
SELECT t.id, gc.id FROM generated_content gc
JOIN tags t ON t.user_id = gc.user_id AND t.label = ANY(gc.tags)
WHERE gc.product = 'digest' AND gc.tags IS NOT NULL AND gc.tags <> '{}';

INSERT INTO content_tags (tag_id, content_id)
SELECT t.id, gc.id FROM generated_content gc
JOIN tags t ON t.user_id = gc.user_id AND t.label = ANY(gc.tags)
WHERE gc.product IN ('compose', 'newsletter') AND gc.tags IS NOT NULL AND gc.tags <> '{}';

ALTER TABLE generated_content DROP CONSTRAINT IF EXISTS generated_content_status_check;
ALTER TABLE generated_content ADD CONSTRAINT generated_content_status_check CHECK (status IN ('draft'));
