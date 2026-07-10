package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rodrigo-militao/forge/internal/core/domain"
	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

// EditionRepository implements digest.EditionRepository.
type EditionRepository struct {
	pool *pgxpool.Pool
	q    *Queries
}

func NewEditionRepository(pool *pgxpool.Pool) *EditionRepository {
	return &EditionRepository{pool: pool, q: New(pool)}
}

func (r *EditionRepository) Create(ctx context.Context, edition *digest.Edition) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	qtx := r.q.WithTx(tx)

	row, err := qtx.CreateEdition(ctx, CreateEditionParams{
		UserID:       pgtype.UUID{Bytes: edition.UserID, Valid: true},
		Title:        edition.Title,
		Introduction: edition.Introduction,
	})
	if err != nil {
		return err
	}
	edition.ID = row.ID.Bytes
	edition.CreatedAt = row.CreatedAt.Time
	edition.UpdatedAt = row.UpdatedAt.Time

	for i, item := range edition.Items {
		eItem, err := qtx.CreateEditionItem(ctx, CreateEditionItemParams{
			EditionID: pgtype.UUID{Bytes: row.ID.Bytes, Valid: true},
			ContentID: pgtype.UUID{Bytes: item.ContentID, Valid: true},
			SortOrder: int32(i + 1),
		})
		if err != nil {
			return err
		}
		edition.Items[i].ID = eItem.ID.Bytes
	}

	return tx.Commit(ctx)
}

func (r *EditionRepository) GetByID(ctx context.Context, id uuid.UUID) (*digest.Edition, error) {
	row, err := r.q.GetEditionByID(ctx, pgtype.UUID{Bytes: id, Valid: true})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}

	itemRows, err := r.q.ListEditionItems(ctx, pgtype.UUID{Bytes: id, Valid: true})
	if err != nil {
		return nil, err
	}

	items := make([]digest.EditionItem, len(itemRows))
	for i, ir := range itemRows {
		items[i] = digest.EditionItem{
			ID:        ir.ID.Bytes,
			EditionID: ir.EditionID.Bytes,
			ContentID: ir.ContentID.Bytes,
			SortOrder: int(ir.SortOrder),
			CreatedAt: ir.CreatedAt.Time,
		}
	}

	return &digest.Edition{
		ID:           row.ID.Bytes,
		UserID:       row.UserID.Bytes,
		Title:        row.Title,
		Introduction: row.Introduction,
		Status:       digest.EditionStatus(row.Status),
		Items:        items,
		CreatedAt:    row.CreatedAt.Time,
		UpdatedAt:    row.UpdatedAt.Time,
	}, nil
}

func (r *EditionRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]digest.Edition, error) {
	rows, err := r.q.ListEditionsByUser(ctx, pgtype.UUID{Bytes: userID, Valid: true})
	if err != nil {
		return nil, err
	}
	result := make([]digest.Edition, len(rows))
	for i, row := range rows {
		result[i] = digest.Edition{
			ID:           row.ID.Bytes,
			UserID:       row.UserID.Bytes,
			Title:        row.Title,
			Introduction: row.Introduction,
			Status:       digest.EditionStatus(row.Status),
			CreatedAt:    row.CreatedAt.Time,
			UpdatedAt:    row.UpdatedAt.Time,
		}
	}
	return result, nil
}

func (r *EditionRepository) UpdateBody(ctx context.Context, id uuid.UUID, title, introduction string) error {
	_, err := r.q.UpdateEditionBody(ctx, UpdateEditionBodyParams{
		ID:           pgtype.UUID{Bytes: id, Valid: true},
		Title:        title,
		Introduction: introduction,
	})
	return err
}

func (r *EditionRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status digest.EditionStatus) error {
	_, err := r.q.UpdateEditionStatus(ctx, UpdateEditionStatusParams{
		ID:     pgtype.UUID{Bytes: id, Valid: true},
		Status: string(status),
	})
	return err
}
