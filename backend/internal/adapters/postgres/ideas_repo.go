package postgres

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"

	"github.com/rodrigo-militao/forge/internal/core/domain"
)

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

type IdeasRepository struct {
	q *Queries
}

func NewIdeasRepository(q *Queries) *IdeasRepository {
	return &IdeasRepository{q: q}
}

func (r *IdeasRepository) Create(ctx context.Context, idea *domain.Idea) error {
	created, err := r.q.CreateIdea(ctx, CreateIdeaParams{
		UserID:     uuidToPgtype(idea.UserID),
		Title:      idea.Title,
		Context:    idea.Context,
		Notes:      idea.Notes,
		References: idea.References,
		Priority:   string(idea.Priority),
		Status:     string(idea.Status),
	})
	if err != nil {
		return err
	}
	idea.ID = created.ID.Bytes
	idea.CreatedAt = created.CreatedAt.Time
	idea.UpdatedAt = created.UpdatedAt.Time
	return nil
}

func (r *IdeasRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.Idea, error) {
	i, err := r.q.GetIdeaByID(ctx, uuidToPgtype(id))
	if err != nil {
		return nil, fmt.Errorf("idea not found: %w", err)
	}
	idea := &domain.Idea{
		ID:         i.ID.Bytes,
		UserID:     i.UserID.Bytes,
		Title:      i.Title,
		Context:    i.Context,
		Notes:      i.Notes,
		References: i.References,
		Priority:   domain.IdeaPriority(i.Priority),
		Status:     domain.IdeaStatus(i.Status),
		CreatedAt:  i.CreatedAt.Time,
		UpdatedAt:  i.UpdatedAt.Time,
	}
	tags, err := r.q.ListIdeaTagsByIdeaID(ctx, uuidToPgtype(id))
	if err == nil {
		idea.Tags = tags
	}
	return idea, nil
}

func (r *IdeasRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.Idea, error) {
	rows, err := r.q.ListIdeasByUser(ctx, uuidToPgtype(userID))
	if err != nil {
		return nil, err
	}

	ideas := make([]domain.Idea, len(rows))
	for i, row := range rows {
		ideas[i] = domain.Idea{
			ID:         row.ID.Bytes,
			UserID:     row.UserID.Bytes,
			Title:      row.Title,
			Context:    row.Context,
			Notes:      row.Notes,
			References: row.References,
			Priority:   domain.IdeaPriority(row.Priority),
			Status:     domain.IdeaStatus(row.Status),
			CreatedAt:  row.CreatedAt.Time,
			UpdatedAt:  row.UpdatedAt.Time,
		}
	}

	// Batch-load tags for all ideas
	if len(ideas) > 0 {
		ids := make([]pgtype.UUID, len(ideas))
		for i := range ideas {
			ids[i] = uuidToPgtype(ideas[i].ID)
		}
		tagRows, err := r.q.ListIdeaTagsByIdeaIDs(ctx, ids)
		if err == nil {
			tagMap := make(map[string][]string)
			for _, tr := range tagRows {
				key := tr.IdeaID.String()
				tagMap[key] = append(tagMap[key], tr.Label)
			}
			for i := range ideas {
				key := uuidToPgtype(ideas[i].ID).String()
				ideas[i].Tags = tagMap[key]
				if ideas[i].Tags == nil {
					ideas[i].Tags = []string{}
				}
			}
		}
	}

	return ideas, nil
}

func (r *IdeasRepository) Update(ctx context.Context, idea *domain.Idea) error {
	updated, err := r.q.UpdateIdea(ctx, UpdateIdeaParams{
		ID:         uuidToPgtype(idea.ID),
		Title:      idea.Title,
		Context:    idea.Context,
		Notes:      idea.Notes,
		References: idea.References,
		Priority:   string(idea.Priority),
		Status:     string(idea.Status),
	})
	if err != nil {
		return err
	}
	idea.UpdatedAt = updated.UpdatedAt.Time
	return nil
}

func (r *IdeasRepository) Archive(ctx context.Context, id uuid.UUID) error {
	return r.q.SoftDeleteIdea(ctx, uuidToPgtype(id))
}

func (r *IdeasRepository) AddTag(ctx context.Context, ideaID uuid.UUID, tagLabel string, userID uuid.UUID) error {
	tag, err := r.q.EnsureTagForIdea(ctx, EnsureTagForIdeaParams{
		UserID: uuidToPgtype(userID),
		Label:  tagLabel,
	})
	if err != nil {
		return fmt.Errorf("creating tag: %w", err)
	}
	return r.q.AddIdeaTag(ctx, AddIdeaTagParams{
		TagID:  tag.ID,
		IdeaID: uuidToPgtype(ideaID),
	})
}

func (r *IdeasRepository) RemoveTag(ctx context.Context, ideaID uuid.UUID, tagLabel string, userID uuid.UUID) error {
	tag, err := r.q.EnsureTagForIdea(ctx, EnsureTagForIdeaParams{
		UserID: uuidToPgtype(userID),
		Label:  tagLabel,
	})
	if err != nil {
		return fmt.Errorf("looking up tag: %w", err)
	}
	return r.q.RemoveIdeaTag(ctx, RemoveIdeaTagParams{
		TagID:  tag.ID,
		IdeaID: uuidToPgtype(ideaID),
	})
}

func (r *IdeasRepository) LinkArticle(ctx context.Context, ideaID uuid.UUID, contentID uuid.UUID) error {
	return r.q.AddIdeaArticle(ctx, AddIdeaArticleParams{
		IdeaID:    uuidToPgtype(ideaID),
		ContentID: uuidToPgtype(contentID),
	})
}
