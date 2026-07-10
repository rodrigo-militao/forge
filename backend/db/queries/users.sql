-- Users (tenants)
-- name: CreateUser :one
INSERT INTO users (email, password_hash, name, locale)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE email = $1;

-- name: UpdateUser :one
UPDATE users
SET email = $2, name = $3, password_hash = $4, plano_ativo = $5, locale = $6, updated_at = now()
WHERE id = $1
RETURNING *;
