package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rodrigo-militao/forge/internal/core/domain"
)

// ReferenceRepository persists editorial References using the sqlc-generated queries.
type ReferenceRepository struct {
	pool *pgxpool.Pool
	q    *Queries
}

func NewReferenceRepository(pool *pgxpool.Pool) *ReferenceRepository {
	return &ReferenceRepository{pool: pool, q: New(pool)}
}

func (r *ReferenceRepository) Create(ctx context.Context, ref *domain.Reference) error {
	created, err := r.q.CreateReference(ctx, CreateReferenceParams{
		UserID:        uuidToPgtype(ref.UserID),
		Url:           ref.URL,
		Title:         ref.Title,
		Description:   ref.Description,
		SourceName:    ref.SourceName,
		ReferenceType: ref.ReferenceType,
	})
	if err != nil {
		return err
	}
	*ref = referenceFromModel(created)
	return nil
}

func (r *ReferenceRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Reference, error) {
	ref, err := r.q.GetReferenceByID(ctx, uuidToPgtype(id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return referenceToDomain(ref), nil
}

func (r *ReferenceRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.Reference, error) {
	rows, err := r.q.ListReferencesByUser(ctx, uuidToPgtype(userID))
	if err != nil {
		return nil, err
	}
	result := make([]domain.Reference, len(rows))
	for i, row := range rows {
		result[i] = *referenceToDomain(row)
	}
	return result, nil
}

func (r *ReferenceRepository) Update(ctx context.Context, ref *domain.Reference) error {
	updated, err := r.q.UpdateReference(ctx, UpdateReferenceParams{
		ID:            uuidToPgtype(ref.ID),
		Url:           ref.URL,
		Title:         ref.Title,
		Description:   ref.Description,
		SourceName:    ref.SourceName,
		ReferenceType: ref.ReferenceType,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.ErrNotFound
		}
		return err
	}
	*ref = referenceFromModel(updated)
	return nil
}

func (r *ReferenceRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.q.DeleteReference(ctx, uuidToPgtype(id))
}

func (r *ReferenceRepository) AttachToIdea(ctx context.Context, ideaID, referenceID uuid.UUID) error {
	return r.q.AttachReferenceToIdea(ctx, AttachReferenceToIdeaParams{
		IdeaID:      uuidToPgtype(ideaID),
		ReferenceID: uuidToPgtype(referenceID),
	})
}

func (r *ReferenceRepository) DetachFromIdea(ctx context.Context, ideaID, referenceID uuid.UUID) error {
	return r.q.DetachReferenceFromIdea(ctx, DetachReferenceFromIdeaParams{
		IdeaID:      uuidToPgtype(ideaID),
		ReferenceID: uuidToPgtype(referenceID),
	})
}

func (r *ReferenceRepository) ListByIdea(ctx context.Context, ideaID uuid.UUID) ([]domain.Reference, error) {
	rows, err := r.q.ListReferencesByIdea(ctx, uuidToPgtype(ideaID))
	if err != nil {
		return nil, err
	}
	result := make([]domain.Reference, len(rows))
	for i, row := range rows {
		result[i] = *referenceToDomain(row)
	}
	return result, nil
}

func (r *ReferenceRepository) AttachToContent(ctx context.Context, contentID, referenceID uuid.UUID) error {
	return r.q.AttachReferenceToContent(ctx, AttachReferenceToContentParams{
		ContentID:   uuidToPgtype(contentID),
		ReferenceID: uuidToPgtype(referenceID),
	})
}

func (r *ReferenceRepository) DetachFromContent(ctx context.Context, contentID, referenceID uuid.UUID) error {
	return r.q.DetachReferenceFromContent(ctx, DetachReferenceFromContentParams{
		ContentID:   uuidToPgtype(contentID),
		ReferenceID: uuidToPgtype(referenceID),
	})
}

func (r *ReferenceRepository) ListByContent(ctx context.Context, contentID uuid.UUID) ([]domain.Reference, error) {
	rows, err := r.q.ListReferencesByContent(ctx, uuidToPgtype(contentID))
	if err != nil {
		return nil, err
	}
	result := make([]domain.Reference, len(rows))
	for i, row := range rows {
		result[i] = *referenceToDomain(row)
	}
	return result, nil
}

// referenceToDomain converts a sqlc Reference model to a domain Reference.
func referenceToDomain(r Reference) *domain.Reference {
	return &domain.Reference{
		ID:            r.ID.Bytes,
		UserID:        r.UserID.Bytes,
		URL:           r.Url,
		Title:         r.Title,
		Description:   r.Description,
		SourceName:    r.SourceName,
		ReferenceType: r.ReferenceType,
		CreatedAt:     r.CreatedAt.Time,
		UpdatedAt:     r.UpdatedAt.Time,
	}
}

// referenceFromModel converts from sqlc model to domain Reference.
func referenceFromModel(r Reference) domain.Reference {
	return domain.Reference{
		ID:            r.ID.Bytes,
		UserID:        r.UserID.Bytes,
		URL:           r.Url,
		Title:         r.Title,
		Description:   r.Description,
		SourceName:    r.SourceName,
		ReferenceType: r.ReferenceType,
		CreatedAt:     r.CreatedAt.Time,
		UpdatedAt:     r.UpdatedAt.Time,
	}
}
