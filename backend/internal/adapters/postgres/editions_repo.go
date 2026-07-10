package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
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
		UserID:       uuidToPgtype(edition.UserID),
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
			EditionID: uuidToPgtype(uuid.UUID(row.ID.Bytes)),
			ContentID: uuidToPgtype(item.ContentID),
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
	row, err := r.q.GetEditionByID(ctx, uuidToPgtype(id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}

	itemRows, err := r.q.ListEditionItems(ctx, uuidToPgtype(id))
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
	rows, err := r.q.ListEditionsByUser(ctx, uuidToPgtype(userID))
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
		ID:           uuidToPgtype(id),
		Title:        title,
		Introduction: introduction,
	})
	return err
}

func (r *EditionRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status digest.EditionStatus) error {
	_, err := r.q.UpdateEditionStatus(ctx, UpdateEditionStatusParams{
		ID:     uuidToPgtype(id),
		Status: string(status),
	})
	return err
}
