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

-- name: UpdateContentStatus :one
UPDATE generated_content
SET status = $2, updated_at = now()
WHERE id = $1
RETURNING *;

-- name: UpdateContentBody :one
UPDATE generated_content
SET title = COALESCE($2, title), body_markdown = COALESCE($3, body_markdown), updated_at = now()
WHERE id = $1
RETURNING *;

-- name: ListApprovedDigest :many
SELECT gc.* FROM generated_content gc
WHERE gc.user_id = $1
  AND gc.product = 'digest'
  AND gc.status = 'approved'
ORDER BY gc.updated_at DESC;
