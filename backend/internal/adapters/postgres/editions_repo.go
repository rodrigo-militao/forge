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
	qtx, tx, err := beginTx(ctx, r.pool, r.q)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	row, err := qtx.CreateEdition(ctx, CreateEditionParams{
		UserID:       uuidToPgtype(edition.UserID),
		Title:        edition.Title,
		Introduction: edition.Introduction,
		Category:     edition.Category,
	})
	if err != nil {
		return err
	}
	edition.ID = row.ID.Bytes
	edition.CreatedAt = row.CreatedAt.Time
	edition.UpdatedAt = row.UpdatedAt.Time

	return tx.Commit(ctx)
}

func (r *EditionRepository) loadTags(ctx context.Context, editionID pgtype.UUID) []string {
	labels, err := r.q.ListNewsletterEditionTags(ctx, editionID)
	if err != nil {
		return nil
	}
	return labels
}

// loadTagsBatch loads tags for multiple editions in a single query.
func (r *EditionRepository) loadTagsBatch(ctx context.Context, editionIDs []pgtype.UUID) map[pgtype.UUID][]string {
	if len(editionIDs) == 0 {
		return nil
	}
	rows, err := r.q.ListNewsletterEditionTagsByEditionIDs(ctx, editionIDs)
	if err != nil {
		return nil
	}
	result := make(map[pgtype.UUID][]string, len(editionIDs))
	for _, row := range rows {
		result[row.EditionID] = append(result[row.EditionID], row.Label)
	}
	return result
}

func (r *EditionRepository) GetByID(ctx context.Context, id uuid.UUID) (*digest.Edition, error) {
	row, err := r.q.GetEditionByID(ctx, uuidToPgtype(id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}

	return &digest.Edition{
		ID:           row.ID.Bytes,
		UserID:       row.UserID.Bytes,
		Title:        row.Title,
		Introduction: row.Introduction,
		Category:     row.Category,
		Status:       digest.EditionStatus(row.Status),
		Tags:         r.loadTags(ctx, row.ID),
		CreatedAt:    row.CreatedAt.Time,
		UpdatedAt:    row.UpdatedAt.Time,
	}, nil
}

func (r *EditionRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]digest.Edition, error) {
	rows, err := r.q.ListEditionsByUser(ctx, uuidToPgtype(userID))
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return []digest.Edition{}, nil
	}
	ids := make([]pgtype.UUID, len(rows))
	for i, row := range rows {
		ids[i] = row.ID
	}
	tagMap := r.loadTagsBatch(ctx, ids)
	result := make([]digest.Edition, len(rows))
	for i, row := range rows {
		tags := tagMap[row.ID]
		if tags == nil {
			tags = []string{}
		}
		result[i] = digest.Edition{
			ID:           row.ID.Bytes,
			UserID:       row.UserID.Bytes,
			Title:        row.Title,
			Introduction: row.Introduction,
			Category:     row.Category,
			Status:       digest.EditionStatus(row.Status),
			Tags:         tags,
			CreatedAt:    row.CreatedAt.Time,
			UpdatedAt:    row.UpdatedAt.Time,
		}
	}
	return result, nil
}

func (r *EditionRepository) ListByUserFiltered(ctx context.Context, userID uuid.UUID, status, category *string) ([]digest.Edition, error) {
	rows, err := r.q.ListEditionsByUserFiltered(ctx, ListEditionsByUserFilteredParams{
		UserID:         uuidToPgtype(userID),
		StatusFilter:   status,
		CategoryFilter: category,
	})
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return []digest.Edition{}, nil
	}
	ids := make([]pgtype.UUID, len(rows))
	for i, row := range rows {
		ids[i] = row.ID
	}
	tagMap := r.loadTagsBatch(ctx, ids)
	result := make([]digest.Edition, len(rows))
	for i, row := range rows {
		tags := tagMap[row.ID]
		if tags == nil {
			tags = []string{}
		}
		result[i] = digest.Edition{
			ID:           row.ID.Bytes,
			UserID:       row.UserID.Bytes,
			Title:        row.Title,
			Introduction: row.Introduction,
			Category:     row.Category,
			Status:       digest.EditionStatus(row.Status),
			Tags:         tags,
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

func (r *EditionRepository) UpdateCategory(ctx context.Context, id uuid.UUID, category *string) error {
	_, err := r.q.UpdateEditionCategory(ctx, UpdateEditionCategoryParams{
		ID:       uuidToPgtype(id),
		Category: category,
	})
	return err
}

func (r *EditionRepository) AddTag(ctx context.Context, editionID uuid.UUID, tag string) error {
	edition, err := r.GetByID(ctx, editionID)
	if err != nil {
		return err
	}
	_, err = r.q.EnsureTag(ctx, EnsureTagParams{
		UserID: uuidToPgtype(edition.UserID),
		Label:  tag,
	})
	if err != nil {
		return err
	}
	tagRow, err := r.q.GetTagByLabel(ctx, GetTagByLabelParams{
		UserID: uuidToPgtype(edition.UserID),
		Label:  tag,
	})
	if err != nil {
		return err
	}
	return r.q.AddNewsletterEditionTag(ctx, AddNewsletterEditionTagParams{
		EditionID: uuidToPgtype(editionID),
		TagID:     tagRow.ID,
	})
}

func (r *EditionRepository) RemoveTag(ctx context.Context, editionID uuid.UUID, tag string) error {
	edition, err := r.GetByID(ctx, editionID)
	if err != nil {
		return err
	}
	tagRow, err := r.q.GetTagByLabel(ctx, GetTagByLabelParams{
		UserID: uuidToPgtype(edition.UserID),
		Label:  tag,
	})
	if err != nil {
		return err
	}
	return r.q.RemoveNewsletterEditionTag(ctx, RemoveNewsletterEditionTagParams{
		EditionID: uuidToPgtype(editionID),
		TagID:     tagRow.ID,
	})
}

func (r *EditionRepository) AddArticle(ctx context.Context, newsletterID, contentID uuid.UUID) error {
	return r.q.AddNewsletterArticle(ctx, AddNewsletterArticleParams{
		NewsletterID:    uuidToPgtype(newsletterID),
		DigestArticleID: uuidToPgtype(contentID),
	})
}

func (r *EditionRepository) ListArticles(ctx context.Context, editionID uuid.UUID) ([]digest.ArticleRef, error) {
	rows, err := r.q.ListNewsletterArticlesByEditionID(ctx, uuidToPgtype(editionID))
	if err != nil {
		return nil, err
	}
	result := make([]digest.ArticleRef, len(rows))
	for i, row := range rows {
			title := ""
		if row.Title != nil {
			title = *row.Title
		}
		body := ""
		if row.BodyMarkdown != nil {
			body = *row.BodyMarkdown
		}
		result[i] = digest.ArticleRef{
			ContentID:    row.DigestArticleID.Bytes,
			Title:        title,
			BodyMarkdown: body,
			AddedAt:      row.AddedAt.Time.Format("2006-01-02T15:04:05Z"),
		}
	}
	return result, nil
}

func (r *EditionRepository) RemoveArticle(ctx context.Context, newsletterID, contentID uuid.UUID) error {
	return r.q.RemoveNewsletterArticle(ctx, RemoveNewsletterArticleParams{
		NewsletterID:    uuidToPgtype(newsletterID),
		DigestArticleID: uuidToPgtype(contentID),
	})
}

func (r *EditionRepository) ListArticleIDsInAnyNewsletter(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.q.ListArticleIDsInAnyNewsletter(ctx, uuidToPgtype(userID))
	if err != nil {
		return nil, err
	}
	ids := make([]uuid.UUID, 0, len(rows))
	for _, row := range rows {
		ids = append(ids, row.Bytes)
	}
	return ids, nil
}
