-- Async job queue (ADR 0028)
-- name: CreateJob :one
INSERT INTO jobs (user_id, type, payload)
VALUES ($1, $2, $3)
RETURNING *;

-- name: ClaimNextJob :one
WITH next_job AS (
    SELECT id FROM jobs
    WHERE status = 'pending'
       OR (status = 'processing' AND updated_at < now() - interval '10 minutes')
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
)
UPDATE jobs
SET status = 'processing', updated_at = now()
FROM next_job
WHERE jobs.id = next_job.id
RETURNING jobs.*;

-- name: UpdateJobStatus :one
UPDATE jobs
SET status = $2, error = $3, updated_at = now()
WHERE id = $1
RETURNING *;
