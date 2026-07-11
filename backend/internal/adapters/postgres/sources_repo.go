package postgres

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

// SourceRepository implements digest.SourceRepository.
type SourceRepository struct {
	pool *pgxpool.Pool
	q    *Queries
}

func NewSourceRepository(pool *pgxpool.Pool) *SourceRepository {
	return &SourceRepository{pool: pool, q: New(pool)}
}

func (r *SourceRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]digest.SourceConfig, error) {
	rows, err := r.q.ListSourcesByUser(ctx, uuidToPgtype(userID))
	if err != nil {
		return nil, err
	}
	items := make([]digest.SourceConfig, 0, len(rows))
	for _, row := range rows {
		items = append(items, sourceConfigFromModel(row))
	}
	return items, nil
}

func (r *SourceRepository) Create(ctx context.Context, userID uuid.UUID, name string, sourceType digest.SourceType, config json.RawMessage) (*digest.SourceConfig, error) {
	if config == nil {
		config = json.RawMessage("{}")
	}
	row, err := r.q.CreateSource(ctx, CreateSourceParams{
		UserID: uuidToPgtype(userID),
		Name:   name,
		Type:   string(sourceType),
		Config: config,
	})
	if err != nil {
		return nil, err
	}
	s := sourceConfigFromModel(row)
	return &s, nil
}

func (r *SourceRepository) Update(ctx context.Context, id uuid.UUID, userID uuid.UUID, name string, sourceType digest.SourceType, config json.RawMessage, enabled bool) (*digest.SourceConfig, error) {
	if config == nil {
		config = json.RawMessage("{}")
	}
	row, err := r.q.UpdateSource(ctx, UpdateSourceParams{
		ID:      uuidToPgtype(id),
		Name:    name,
		Type:    string(sourceType),
		Config:  config,
		Enabled: enabled,
		UserID:  uuidToPgtype(userID),
	})
	if err != nil {
		return nil, err
	}
	s := sourceConfigFromModel(row)
	return &s, nil
}

func (r *SourceRepository) Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	err := r.q.DeleteSource(ctx, DeleteSourceParams{
		ID:     uuidToPgtype(id),
		UserID: uuidToPgtype(userID),
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil
	}
	return err
}

func sourceConfigFromModel(row Source) digest.SourceConfig {
	return digest.SourceConfig{
		ID:        row.ID.Bytes,
		UserID:    row.UserID.Bytes,
		Name:      row.Name,
		Type:      digest.SourceType(row.Type),
		Config:    row.Config,
		Enabled:   row.Enabled,
		CreatedAt: row.CreatedAt.Time,
		UpdatedAt: row.UpdatedAt.Time,
	}
}
