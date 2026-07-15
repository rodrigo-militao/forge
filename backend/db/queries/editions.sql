-- Newsletter editions (ADR 0029)
-- name: CreateEdition :one
INSERT INTO newsletter_editions (user_id, title, introduction, category, destination)
VALUES ($1, $2, $3, sqlc.narg('category'), sqlc.narg('destination'))
RETURNING *;

-- name: GetEditionByID :one
SELECT * FROM newsletter_editions WHERE id = $1;

-- name: ListEditionsByUser :many
SELECT * FROM newsletter_editions
WHERE user_id = $1
ORDER BY created_at DESC;

-- name: UpdateEditionBody :one
UPDATE newsletter_editions
SET title = $2, introduction = $3, updated_at = now()
WHERE id = $1
RETURNING *;

-- name: UpdateEditionStatus :one
UPDATE newsletter_editions
SET status = $2, updated_at = now()
WHERE id = $1
RETURNING *;

-- Edition items (removed — replaced by newsletter_articles in ADR 0043)

-- name: ListArticleIDsInAnyNewsletter :many
SELECT DISTINCT na.digest_article_id
FROM newsletter_articles na
JOIN newsletter_editions ne ON na.newsletter_id = ne.id
WHERE ne.user_id = $1;

-- name: AddNewsletterArticle :exec
INSERT INTO newsletter_articles (newsletter_id, digest_article_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: RemoveNewsletterArticle :exec
DELETE FROM newsletter_articles
WHERE newsletter_id = $1 AND digest_article_id = $2;

-- name: ListNewsletterArticlesByEditionID :many
SELECT na.digest_article_id, na.added_at, gc.title, gc.body_markdown
FROM newsletter_articles na
JOIN generated_content gc ON na.digest_article_id = gc.id
WHERE na.newsletter_id = $1
ORDER BY na.added_at;

-- name: UpdateEditionCategory :one
UPDATE newsletter_editions
SET category = $2, updated_at = now()
WHERE id = $1
RETURNING *;

-- name: ListEditionsByUserFiltered :many
SELECT * FROM newsletter_editions
WHERE user_id = $1
  AND (sqlc.narg('status_filter')::TEXT IS NULL OR status = sqlc.narg('status_filter'))
  AND (sqlc.narg('category_filter')::TEXT IS NULL OR category = sqlc.narg('category_filter'))
ORDER BY created_at DESC;

-- Newsletter edition tags
-- name: AddNewsletterEditionTag :exec
INSERT INTO newsletter_edition_tags (edition_id, tag_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: RemoveNewsletterEditionTag :exec
DELETE FROM newsletter_edition_tags
WHERE edition_id = $1 AND tag_id = $2;

-- name: ListNewsletterEditionTags :many
SELECT t.label FROM newsletter_edition_tags net
JOIN tags t ON t.id = net.tag_id
WHERE net.edition_id = $1
ORDER BY t.label;

-- name: ListNewsletterEditionTagsByEditionIDs :many
SELECT net.edition_id, t.label FROM newsletter_edition_tags net
JOIN tags t ON t.id = net.tag_id
WHERE net.edition_id = ANY($1::UUID[])
ORDER BY t.label;

-- name: UpdateEditionDestination :one
UPDATE newsletter_editions
SET destination = $2, updated_at = now()
WHERE id = $1
RETURNING *;

-- name: ListArticleCountsByEditionIDs :many
SELECT na.newsletter_id, COUNT(*)::INT as article_count
FROM newsletter_articles na
WHERE na.newsletter_id = ANY($1::UUID[])
GROUP BY na.newsletter_id;

-- name: DuplicateEdition :one
INSERT INTO newsletter_editions (user_id, title, destination)
VALUES ($1, $2, $3)
RETURNING *;

-- name: ListUsedDestinationsByUser :many
SELECT DISTINCT destination FROM newsletter_editions
WHERE user_id = $1 AND destination IS NOT NULL AND destination <> ''
ORDER BY destination;
