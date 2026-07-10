-- Content sources (Digest product)
-- name: ListSourcesByUser :many
SELECT * FROM sources WHERE user_id = $1 ORDER BY name;

-- name: CreateSource :one
INSERT INTO sources (user_id, name, type, config)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: UpdateSource :one
UPDATE sources
SET name = $2, type = $3, config = $4, enabled = $5, updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeleteSource :exec
DELETE FROM sources WHERE id = $1;
