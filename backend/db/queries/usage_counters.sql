-- name: GetUsageCounter :one
SELECT coalesce(count, 0)::int FROM usage_counters
WHERE user_id = $1 AND month = $2::date;

-- name: UpsertUsageCounter :one
INSERT INTO usage_counters (user_id, month, count)
VALUES ($1, $2::date, 1)
ON CONFLICT (user_id, month)
DO UPDATE SET count = usage_counters.count + 1
RETURNING count;
