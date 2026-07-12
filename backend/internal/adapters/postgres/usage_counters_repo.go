package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UsageCounterRepository struct {
	q *Queries
}

func NewUsageCounterRepository(pool *pgxpool.Pool) *UsageCounterRepository {
	return &UsageCounterRepository{q: New(pool)}
}

func currentMonthDate() pgtype.Date {
	now := time.Now().UTC()
	s := fmt.Sprintf("%04d-%02d-01", now.Year(), now.Month())
	var d pgtype.Date
	d.Scan(s)
	return d
}

func (r *UsageCounterRepository) Get(ctx context.Context, userID uuid.UUID, _ string) (int, error) {
	n, err := r.q.GetUsageCounter(ctx, GetUsageCounterParams{
		UserID:  uuidToPgtype(userID),
		Column2: currentMonthDate(),
	})
	return int(n), err
}

func (r *UsageCounterRepository) Increment(ctx context.Context, userID uuid.UUID, _ string) (int, error) {
	n, err := r.q.UpsertUsageCounter(ctx, UpsertUsageCounterParams{
		UserID:  uuidToPgtype(userID),
		Column2: currentMonthDate(),
	})
	return int(n), err
}
