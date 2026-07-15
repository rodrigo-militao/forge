-- Generated content

-- name: CreateContent :one
INSERT INTO generated_content (user_id, product, status, source_type, title, body_markdown, metadata, origin)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
RETURNING *;

-- name: GetContentByID :one
SELECT * FROM generated_content WHERE id = $1;

-- name: ListContentByUser :many
SELECT * FROM generated_content
WHERE user_id = $1
ORDER BY created_at DESC;

-- name: UpdateContentBody :one
UPDATE generated_content
SET title = COALESCE($2, title), body_markdown = COALESCE($3, body_markdown), updated_at = now()
WHERE id = $1
RETURNING *;

-- name: AddContentTagArray :one
UPDATE generated_content
SET tags = array_append(tags, $2), updated_at = now()
WHERE id = $1 AND NOT ($2 = ANY(tags))
RETURNING *;

-- name: RemoveContentTagArray :one
UPDATE generated_content
SET tags = array_remove(tags, $2), updated_at = now()
WHERE id = $1
RETURNING *;

-- name: EnsureTag :one
INSERT INTO tags (user_id, label)
VALUES ($1, $2)
ON CONFLICT (user_id, label) DO NOTHING
RETURNING *;

-- name: GetTagByLabel :one
SELECT * FROM tags
WHERE user_id = $1 AND label = $2;

-- name: AddDigestArticleTag :exec
INSERT INTO digest_article_tags (tag_id, article_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: RemoveDigestArticleTag :exec
DELETE FROM digest_article_tags
WHERE tag_id = $1 AND article_id = $2;

-- name: AddContentTagJunction :exec
INSERT INTO content_tags (tag_id, content_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: RemoveContentTagJunction :exec
DELETE FROM content_tags
WHERE tag_id = $1 AND content_id = $2;

-- name: ListUserTags :many
SELECT label FROM tags
WHERE user_id = $1
ORDER BY label;

-- name: SoftDeleteContent :one
UPDATE generated_content
SET deleted_at = now(), updated_at = now()
WHERE id = $1
RETURNING *;

-- name: ListContentWithoutCategory :many
SELECT * FROM generated_content
WHERE user_id = $1 AND product = 'digest' AND categories = '{}' AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $2;

-- name: UpdateContentStatus :one
UPDATE generated_content
SET status = $2, updated_at = now()
WHERE id = $1
RETURNING *;

-- name: ContentExistsByURL :one
SELECT EXISTS(
  SELECT 1 FROM generated_content
  WHERE user_id = $1 AND metadata->>'source_url' = $2::text
) AS found;

-- =============================================================================
-- Categories (ADR 0045)
-- =============================================================================

-- name: EnsureCategory :one
INSERT INTO categories (user_id, label)
VALUES ($1, $2)
ON CONFLICT (user_id, label) DO UPDATE SET label = EXCLUDED.label
RETURNING *;

-- name: GetCategoryByLabel :one
SELECT * FROM categories
WHERE user_id = $1 AND label = $2;

-- name: AddArticleCategory :exec
INSERT INTO article_categories (category_id, article_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: RemoveArticleCategory :exec
DELETE FROM article_categories
WHERE category_id = $1 AND article_id = $2;

-- name: AddArticleCategoryArray :one
UPDATE generated_content
SET categories = array_append(categories, $2), updated_at = now()
WHERE id = $1 AND NOT ($2 = ANY(categories))
RETURNING *;

-- name: RemoveArticleCategoryArray :one
UPDATE generated_content
SET categories = array_remove(categories, $2), updated_at = now()
WHERE id = $1
RETURNING *;

-- name: ListArticleCategories :many
SELECT c.label FROM article_categories ac
JOIN categories c ON c.id = ac.category_id
WHERE ac.article_id = $1
ORDER BY c.label;

-- name: ListAllCategoriesByUser :many
SELECT DISTINCT label FROM categories
WHERE user_id = $1
ORDER BY label;

-- name: ListUserCategories :many
SELECT label FROM categories
WHERE user_id = $1
ORDER BY label;

-- =============================================================================
-- Digest stats (Phase 2)
-- =============================================================================

-- name: GetDigestStats :one
SELECT
  COALESCE(art.total_count, 0)::int AS total_count,
  COALESCE(art.in_newsletter_count, 0)::int AS in_newsletter_count,
  art.last_discovery AS last_discovery,
  COALESCE(ne.draft_count, 0)::int AS draft_newsletters
FROM (
  SELECT
    COUNT(*) AS total_count,
    COUNT(*) FILTER (WHERE gc.id IN (SELECT na.digest_article_id FROM newsletter_articles na)) AS in_newsletter_count,
    MAX(gc.created_at) AS last_discovery
  FROM generated_content gc
  WHERE gc.user_id = $1 AND gc.product = 'digest' AND gc.deleted_at IS NULL
) art
CROSS JOIN (
  SELECT COUNT(*) AS draft_count
  FROM newsletter_editions
  WHERE user_id = $1 AND status = 'building'
) ne;
