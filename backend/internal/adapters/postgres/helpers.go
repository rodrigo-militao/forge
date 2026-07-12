package postgres

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/pgtype"
)

// uuidToPgtype converts a uuid.UUID to the pgtype.UUID used by sqlc queries.
func uuidToPgtype(id uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: id, Valid: true}
}

// beginTx creates a database transaction and returns a TX-scoped *Queries plus
// the transaction handle. The caller must commit or rollback the tx.
func beginTx(ctx context.Context, pool *pgxpool.Pool, q *Queries) (*Queries, pgx.Tx, error) {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return nil, nil, err
	}
	return q.WithTx(tx), tx, nil
}
