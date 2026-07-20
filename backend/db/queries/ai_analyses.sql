-- name: CreateAIAnalysis :one
INSERT INTO ai_analyses (user_id, content_id, summary, strengths, improvements, score)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetLatestAnalysisByContent :one
SELECT * FROM ai_analyses
WHERE content_id = $1 AND user_id = $2
ORDER BY created_at DESC
LIMIT 1;
