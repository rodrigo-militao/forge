-- Topics (Compose product)
-- name: ListTopicsByUser :many
SELECT * FROM topics WHERE user_id = $1 AND enabled = true ORDER BY created_at DESC;

-- name: CreateTopic :one
INSERT INTO topics (user_id, topic, theme_area, format, one_line_pitch)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: TopicHistory :many
SELECT * FROM topics
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2;
