package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

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
		ContentType:  content.Type,
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

func (r *ContentRepository) UpdateBody(ctx context.Context, id uuid.UUID, title, bodyMarkdown *string) error {
	_, err := r.q.UpdateContentBody(ctx, UpdateContentBodyParams{
		ID:           uuidToPgtype(id),
		Title:        title,
		BodyMarkdown: bodyMarkdown,
	})
	return err
}

func (r *ContentRepository) UpdateOutline(ctx context.Context, id uuid.UUID, outline *string) error {
	_, err := r.q.UpdateContentOutline(ctx, UpdateContentOutlineParams{
		ID:      uuidToPgtype(id),
		Outline: outline,
	})
	return err
}

func (r *ContentRepository) AddCategory(ctx context.Context, id uuid.UUID, category string) error {
	qtx, tx, err := beginTx(ctx, r.pool, r.q)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	c, err := qtx.GetContentByID(ctx, uuidToPgtype(id))
	if err != nil {
		return err
	}
	_, err = qtx.EnsureCategory(ctx, EnsureCategoryParams{
		UserID: c.UserID,
		Label:  category,
	})
	if err != nil {
		return err
	}
	catRow, err := qtx.GetCategoryByLabel(ctx, GetCategoryByLabelParams{
		UserID: c.UserID,
		Label:  category,
	})
	if err != nil {
		return err
	}
	err = qtx.AddArticleCategory(ctx, AddArticleCategoryParams{
		CategoryID: catRow.ID,
		ArticleID:  uuidToPgtype(id),
	})
	if err != nil {
		return err
	}
	catAny := any(category)
	_, err = qtx.AddArticleCategoryArray(ctx, AddArticleCategoryArrayParams{
		ID:          uuidToPgtype(id),
		ArrayAppend: catAny,
	})
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *ContentRepository) RemoveCategory(ctx context.Context, id uuid.UUID, category string) error {
	qtx, tx, err := beginTx(ctx, r.pool, r.q)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	c, err := qtx.GetContentByID(ctx, uuidToPgtype(id))
	if err != nil {
		return err
	}
	catRow, err := qtx.GetCategoryByLabel(ctx, GetCategoryByLabelParams{
		UserID: c.UserID,
		Label:  category,
	})
	if err != nil {
		return err
	}
	err = qtx.RemoveArticleCategory(ctx, RemoveArticleCategoryParams{
		CategoryID: catRow.ID,
		ArticleID:  uuidToPgtype(id),
	})
	if err != nil {
		return err
	}
	catAny := any(category)
	_, err = qtx.RemoveArticleCategoryArray(ctx, RemoveArticleCategoryArrayParams{
		ID:          uuidToPgtype(id),
		ArrayRemove: catAny,
	})
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *ContentRepository) SetCategories(ctx context.Context, id uuid.UUID, categories []string) error {
	qtx, tx, err := beginTx(ctx, r.pool, r.q)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	c, err := qtx.GetContentByID(ctx, uuidToPgtype(id))
	if err != nil {
		return err
	}

	// Remove all existing categories
	existing, err := qtx.ListArticleCategories(ctx, uuidToPgtype(id))
	if err != nil {
		return err
	}
	for _, cat := range existing {
		catRow, err := qtx.GetCategoryByLabel(ctx, GetCategoryByLabelParams{
			UserID: c.UserID,
			Label:  cat,
		})
		if err != nil {
			return err
		}
		err = qtx.RemoveArticleCategory(ctx, RemoveArticleCategoryParams{
			CategoryID: catRow.ID,
			ArticleID:  uuidToPgtype(id),
		})
		if err != nil {
			return err
		}
	}

	// Clear the denormalized array
	_, err = qtx.db.Exec(ctx,
		"UPDATE generated_content SET categories = '{}', updated_at = now() WHERE id = $1",
		uuidToPgtype(id))
	if err != nil {
		return err
	}

	// Add all new categories
	for _, cat := range categories {
		_, err = qtx.EnsureCategory(ctx, EnsureCategoryParams{
			UserID: c.UserID,
			Label:  cat,
		})
		if err != nil {
			return err
		}
		catRow, err := qtx.GetCategoryByLabel(ctx, GetCategoryByLabelParams{
			UserID: c.UserID,
			Label:  cat,
		})
		if err != nil {
			return err
		}
		err = qtx.AddArticleCategory(ctx, AddArticleCategoryParams{
			CategoryID: catRow.ID,
			ArticleID:  uuidToPgtype(id),
		})
		if err != nil {
			return err
		}
		catAny := any(cat)
		_, err = qtx.AddArticleCategoryArray(ctx, AddArticleCategoryArrayParams{
			ID:          uuidToPgtype(id),
			ArrayAppend: catAny,
		})
		if err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

func (r *ContentRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.ContentStatus) error {
	_, err := r.q.UpdateContentStatus(ctx, UpdateContentStatusParams{
		ID:     uuidToPgtype(id),
		Status: status,
	})
	return err
}

func (r *ContentRepository) UpdateStatusWithPublishedAt(ctx context.Context, id uuid.UUID, status domain.ContentStatus) error {
	_, err := r.q.UpdateContentStatusAndPublishedAt(ctx, UpdateContentStatusAndPublishedAtParams{
		ID:     uuidToPgtype(id),
		Status: status,
	})
	return err
}

func (r *ContentRepository) ListWithoutCategory(ctx context.Context, userID uuid.UUID, limit int) ([]domain.GeneratedContent, error) {
	rows, err := r.q.ListContentWithoutCategory(ctx, ListContentWithoutCategoryParams{
		UserID: uuidToPgtype(userID),
		Limit:  int32(limit),
	})
	if err != nil {
		return nil, err
	}
	result := make([]domain.GeneratedContent, len(rows))
	for i, c := range rows {
		result[i] = *contentFromModel(c)
	}
	return result, nil
}

func (r *ContentRepository) ListUserCategories(ctx context.Context, userID uuid.UUID) ([]string, error) {
	return r.q.ListUserCategories(ctx, uuidToPgtype(userID))
}

func (r *ContentRepository) GetDigestStats(ctx context.Context, userID uuid.UUID) (*ports.DigestStats, error) {
	row, err := r.q.GetDigestStats(ctx, uuidToPgtype(userID))
	if err != nil {
		return nil, err
	}
	var lastDiscovery *time.Time
	if row.LastDiscovery != nil {
		t, ok := row.LastDiscovery.(time.Time)
		if ok {
			lastDiscovery = &t
		}
	}
	return &ports.DigestStats{
		TotalCount:        int(row.TotalCount),
		InNewsletterCount: int(row.InNewsletterCount),
		LastDiscovery:     lastDiscovery,
		DraftNewsletters:  int(row.DraftNewsletters),
	}, nil
}

func (r *ContentRepository) AddTag(ctx context.Context, id uuid.UUID, tag string) error {
	qtx, tx, err := beginTx(ctx, r.pool, r.q)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	c, err := qtx.GetContentByID(ctx, uuidToPgtype(id))
	if err != nil {
		return err
	}
	_, err = qtx.EnsureTag(ctx, EnsureTagParams{
		UserID: c.UserID,
		Label:  tag,
	})
	if err != nil {
		return err
	}
	tagRow, err := qtx.GetTagByLabel(ctx, GetTagByLabelParams{
		UserID: c.UserID,
		Label:  tag,
	})
	if err != nil {
		return err
	}
	if c.Product == domain.ProductDigest {
		err = qtx.AddDigestArticleTag(ctx, AddDigestArticleTagParams{
			TagID:     tagRow.ID,
			ArticleID: uuidToPgtype(id),
		})
	} else {
		err = qtx.AddContentTagJunction(ctx, AddContentTagJunctionParams{
			TagID:     tagRow.ID,
			ContentID: uuidToPgtype(id),
		})
	}
	if err != nil {
		return err
	}
	tagAny := any(tag)
	_, err = qtx.AddContentTagArray(ctx, AddContentTagArrayParams{
		ID:          uuidToPgtype(id),
		ArrayAppend: tagAny,
	})
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *ContentRepository) RemoveTag(ctx context.Context, id uuid.UUID, tag string) error {
	qtx, tx, err := beginTx(ctx, r.pool, r.q)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	c, err := qtx.GetContentByID(ctx, uuidToPgtype(id))
	if err != nil {
		return err
	}
	tagRow, err := qtx.GetTagByLabel(ctx, GetTagByLabelParams{
		UserID: c.UserID,
		Label:  tag,
	})
	if err != nil {
		return err
	}
	if c.Product == domain.ProductDigest {
		err = qtx.RemoveDigestArticleTag(ctx, RemoveDigestArticleTagParams{
			TagID:     tagRow.ID,
			ArticleID: uuidToPgtype(id),
		})
	} else {
		err = qtx.RemoveContentTagJunction(ctx, RemoveContentTagJunctionParams{
			TagID:     tagRow.ID,
			ContentID: uuidToPgtype(id),
		})
	}
	if err != nil {
		return err
	}
	tagAny := any(tag)
	_, err = qtx.RemoveContentTagArray(ctx, RemoveContentTagArrayParams{
		ID:          uuidToPgtype(id),
		ArrayRemove: tagAny,
	})
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *ContentRepository) ListUserTags(ctx context.Context, userID uuid.UUID) ([]string, error) {
	return r.q.ListUserTags(ctx, uuidToPgtype(userID))
}

func (r *ContentRepository) ExistsByURL(ctx context.Context, userID uuid.UUID, url string) (bool, error) {
	return r.q.ContentExistsByURL(ctx, ContentExistsByURLParams{
		UserID:  uuidToPgtype(userID),
		Column2: url,
	})
}

func (r *ContentRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	_, err := r.q.SoftDeleteContent(ctx, uuidToPgtype(id))
	return err
}

func contentFromModel(c GeneratedContent) *domain.GeneratedContent {
	var deletedAt *time.Time
	if c.DeletedAt.Valid {
		deletedAt = &c.DeletedAt.Time
	}
	tags := c.Tags
	if tags == nil {
		tags = []string{}
	}
	cats := c.Categories
	if cats == nil {
		cats = []string{}
	}
	return &domain.GeneratedContent{
		ID:           c.ID.Bytes,
		UserID:       c.UserID.Bytes,
		Type:         c.ContentType,
		Product:      c.Product,
		Status:       c.Status,
		SourceType:   c.SourceType,
		Title:        c.Title,
		BodyMarkdown: c.BodyMarkdown,
		Outline:      c.Outline,
		Metadata:     c.Metadata,
		Origin:       domain.ContentOrigin(c.Origin),
		Categories:   cats,
		Tags:         tags,
		DeletedAt:    deletedAt,
		CreatedAt:    c.CreatedAt.Time,
		UpdatedAt:    c.UpdatedAt.Time,
	}
}

var (
	_ ports.ContentReader         = (*ContentRepository)(nil)
	_ ports.ContentWriter         = (*ContentRepository)(nil)
	_ ports.ContentCategorizer    = (*ContentRepository)(nil)
	_ ports.ContentDigestReader   = (*ContentRepository)(nil)
	_ ports.ContentTagger         = (*ContentRepository)(nil)
)
