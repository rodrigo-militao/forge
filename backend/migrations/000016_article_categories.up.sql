-- ADR 0045: categories table (parallel to tags), article_categories junction,
-- denormalized categories TEXT[] column on generated_content.
-- Migrates existing single-category data into the new structure.

CREATE TABLE categories (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label      TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, label)
);
CREATE INDEX idx_categories_user_id ON categories(user_id);

CREATE TABLE article_categories (
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    article_id  UUID NOT NULL REFERENCES generated_content(id) ON DELETE CASCADE,
    PRIMARY KEY (category_id, article_id)
);
CREATE INDEX idx_article_categories_article_id ON article_categories(article_id);

ALTER TABLE generated_content ADD COLUMN categories TEXT[] NOT NULL DEFAULT '{}';

-- Migrate existing single-category data
INSERT INTO categories (user_id, label)
SELECT DISTINCT user_id, category FROM generated_content
WHERE category IS NOT NULL AND category <> ''
ON CONFLICT (user_id, label) DO NOTHING;

INSERT INTO article_categories (category_id, article_id)
SELECT c.id, gc.id FROM generated_content gc
JOIN categories c ON c.user_id = gc.user_id AND c.label = gc.category
WHERE gc.category IS NOT NULL AND gc.category <> '';

UPDATE generated_content
SET categories = ARRAY[category]
WHERE category IS NOT NULL AND category <> '';
