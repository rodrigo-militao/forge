-- Digest interests (ADR 0032)

-- name: ListDigestInterests :many
SELECT * FROM digest_interests WHERE user_id = $1 ORDER BY label;

-- name: CreateDigestInterest :one
INSERT INTO digest_interests (user_id, label)
VALUES ($1, $2)
RETURNING *;

-- name: DeleteDigestInterest :one
DELETE FROM digest_interests WHERE id = $1 AND user_id = $2
RETURNING *;
