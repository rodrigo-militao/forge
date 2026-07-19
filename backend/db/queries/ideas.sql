-- Ideas

-- name: CreateIdea :one
INSERT INTO ideas (user_id, title, context, notes, "references", priority, status)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetIdeaByID :one
SELECT * FROM ideas WHERE id = $1;

-- name: ListIdeasByUser :many
SELECT * FROM ideas
WHERE user_id = $1
ORDER BY created_at DESC;

-- name: UpdateIdea :one
UPDATE ideas
SET title = COALESCE($2, title),
    context = COALESCE($3, context),
    notes = COALESCE($4, notes),
    "references" = COALESCE($5, "references"),
    priority = COALESCE($6, priority),
    status = COALESCE($7, status),
    updated_at = now()
WHERE id = $1
RETURNING *;

-- name: SoftDeleteIdea :exec
UPDATE ideas SET status = 'archived', updated_at = now() WHERE id = $1;

-- name: EnsureTagForIdea :one
INSERT INTO tags (user_id, label)
VALUES ($1, $2)
ON CONFLICT (user_id, label) DO NOTHING
RETURNING *;

-- name: AddIdeaTag :exec
INSERT INTO idea_tags (tag_id, idea_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: RemoveIdeaTag :exec
DELETE FROM idea_tags
WHERE tag_id = $1 AND idea_id = $2;

-- name: ListIdeaTagsByIdeaID :many
SELECT t.label FROM idea_tags it
JOIN tags t ON t.id = it.tag_id
WHERE it.idea_id = $1
ORDER BY t.label;

-- name: ListIdeaTagsByIdeaIDs :many
SELECT it.idea_id, t.label FROM idea_tags it
JOIN tags t ON t.id = it.tag_id
WHERE it.idea_id = ANY($1::uuid[])
ORDER BY t.label;

-- name: AddIdeaArticle :exec
INSERT INTO idea_articles (idea_id, content_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: ListIdeaArticles :many
SELECT gc.id, gc.title, gc.body_markdown
FROM idea_articles ia
JOIN generated_content gc ON gc.id = ia.content_id
WHERE ia.idea_id = $1
ORDER BY gc.created_at DESC;
