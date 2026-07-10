package postgres

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// ContentRepository implements ports.ContentRepository.
type ContentRepository struct {
	pool *pgxpool.Pool
	q    *Queries
}

func NewContentRepository(pool *pgxpool.Pool) *ContentRepository {
	return &ContentRepository{pool: pool, q: New(pool)}
}

func (r *ContentRepository) Create(ctx context.Context, content *domain.GeneratedContent) error {
	metadata := content.Metadata
	if metadata == nil {
		metadata = json.RawMessage("{}")
	}
	origin := string(content.Origin)
	if origin == "" {
		origin = "ai_generated"
	}
	c, err := r.q.CreateContent(ctx, CreateContentParams{
		UserID:       uuidToPgtype(content.UserID),
		Product:      content.Product,
		Status:       content.Status,
		SourceType:   content.SourceType,
		Title:        content.Title,
		BodyMarkdown: content.BodyMarkdown,
		Metadata:     metadata,
		Origin:       origin,
	})
	if err != nil {
		return err
	}
	content.ID = c.ID.Bytes
	content.CreatedAt = c.CreatedAt.Time
	content.UpdatedAt = c.UpdatedAt.Time
	return nil
}

func (r *ContentRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.GeneratedContent, error) {
	c, err := r.q.GetContentByID(ctx, uuidToPgtype(id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return contentFromModel(c), nil
}

func (r *ContentRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.GeneratedContent, error) {
	rows, err := r.q.ListContentByUser(ctx, uuidToPgtype(userID))
	if err != nil {
		return nil, err
	}
	result := make([]domain.GeneratedContent, len(rows))
	for i, c := range rows {
		result[i] = *contentFromModel(c)
	}
	return result, nil
}

func (r *ContentRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.ContentStatus) error {
	_, err := r.q.UpdateContentStatus(ctx, UpdateContentStatusParams{
		ID:     uuidToPgtype(id),
		Status: status,
	})
	return err
}

func (r *ContentRepository) ListApprovedDigest(ctx context.Context, userID uuid.UUID) ([]domain.GeneratedContent, error) {
	rows, err := r.q.ListApprovedDigest(ctx, uuidToPgtype(userID))
	if err != nil {
		return nil, err
	}
	result := make([]domain.GeneratedContent, len(rows))
	for i, c := range rows {
		result[i] = *contentFromModel(c)
	}
	return result, nil
}

func contentFromModel(c GeneratedContent) *domain.GeneratedContent {
	return &domain.GeneratedContent{
		ID:           c.ID.Bytes,
		UserID:       c.UserID.Bytes,
		Product:      c.Product,
		Status:       c.Status,
		SourceType:   c.SourceType,
		Title:        c.Title,
		BodyMarkdown: c.BodyMarkdown,
		Metadata:     c.Metadata,
		CreatedAt:    c.CreatedAt.Time,
		UpdatedAt:    c.UpdatedAt.Time,
		Origin:       domain.ContentOrigin(c.Origin),
	}
}

var _ ports.ContentRepository = (*ContentRepository)(nil)
