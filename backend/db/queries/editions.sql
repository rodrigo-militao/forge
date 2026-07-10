-- Newsletter editions (ADR 0029)
-- name: CreateEdition :one
INSERT INTO newsletter_editions (user_id, title, introduction)
VALUES ($1, $2, $3)
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

-- Edition items
-- name: CreateEditionItem :one
INSERT INTO newsletter_edition_items (edition_id, content_id, sort_order)
VALUES ($1, $2, $3)
RETURNING *;

-- name: ListEditionItems :many
SELECT * FROM newsletter_edition_items
WHERE edition_id = $1
ORDER BY sort_order;
