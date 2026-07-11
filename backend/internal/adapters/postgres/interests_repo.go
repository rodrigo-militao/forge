package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

// DigestInterestRepository implements digest.DigestInterestRepository.
type DigestInterestRepository struct {
	pool *pgxpool.Pool
	q    *Queries
}

func NewDigestInterestRepository(pool *pgxpool.Pool) *DigestInterestRepository {
	return &DigestInterestRepository{pool: pool, q: New(pool)}
}

func (r *DigestInterestRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]digest.DigestInterest, error) {
	rows, err := r.q.ListDigestInterests(ctx, uuidToPgtype(userID))
	if err != nil {
		return nil, err
	}
	items := make([]digest.DigestInterest, 0, len(rows))
	for _, row := range rows {
		items = append(items, digestInterestFromModel(row))
	}
	return items, nil
}

func (r *DigestInterestRepository) Create(ctx context.Context, userID uuid.UUID, label string) (*digest.DigestInterest, error) {
	row, err := r.q.CreateDigestInterest(ctx, CreateDigestInterestParams{
		UserID: uuidToPgtype(userID),
		Label:  label,
	})
	if err != nil {
		return nil, err
	}
	interest := digestInterestFromModel(row)
	return &interest, nil
}

func (r *DigestInterestRepository) Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	_, err := r.q.DeleteDigestInterest(ctx, DeleteDigestInterestParams{
		ID:     uuidToPgtype(id),
		UserID: uuidToPgtype(userID),
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	return err
}

func digestInterestFromModel(row DigestInterest) digest.DigestInterest {
	return digest.DigestInterest{
		ID:        row.ID.Bytes,
		UserID:    row.UserID.Bytes,
		Label:     row.Label,
		CreatedAt: row.CreatedAt.Time,
	}
}

var _ digest.DigestInterestRepository = (*DigestInterestRepository)(nil)
