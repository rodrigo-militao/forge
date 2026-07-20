-- name: CreateReference :one
INSERT INTO "references" (user_id, url, title, description, source_name, reference_type)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetReferenceByID :one
SELECT * FROM "references" WHERE id = $1;

-- name: ListReferencesByUser :many
SELECT * FROM "references" WHERE user_id = $1 ORDER BY created_at DESC;

-- name: UpdateReference :one
UPDATE "references"
SET url = COALESCE($2, url),
    title = COALESCE($3, title),
    description = COALESCE($4, description),
    source_name = COALESCE($5, source_name),
    reference_type = COALESCE($6, reference_type),
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: DeleteReference :exec
DELETE FROM "references" WHERE id = $1;

-- name: AttachReferenceToIdea :exec
INSERT INTO idea_references (idea_id, reference_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: DetachReferenceFromIdea :exec
DELETE FROM idea_references WHERE idea_id = $1 AND reference_id = $2;

-- name: ListReferencesByIdea :many
SELECT r.* FROM "references" r
JOIN idea_references ir ON ir.reference_id = r.id
WHERE ir.idea_id = $1
ORDER BY ir.created_at DESC;

-- name: AttachReferenceToContent :exec
INSERT INTO content_references (content_id, reference_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: DetachReferenceFromContent :exec
DELETE FROM content_references WHERE content_id = $1 AND reference_id = $2;

-- name: ListReferencesByContent :many
SELECT r.* FROM "references" r
JOIN content_references cr ON cr.reference_id = r.id
WHERE cr.content_id = $1
ORDER BY cr.created_at DESC;
