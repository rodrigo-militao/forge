package application

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// IdeasService coordinates Idea-related use cases.
type IdeasService struct {
	ideas   ports.IdeaRepository
	content ports.ContentRepository
}

func NewIdeasService(ideas ports.IdeaRepository, content ports.ContentRepository) *IdeasService {
	return &IdeasService{ideas: ideas, content: content}
}

func (s *IdeasService) List(ctx context.Context, userID uuid.UUID) ([]domain.Idea, error) {
	return s.ideas.ListByUser(ctx, userID)
}

func (s *IdeasService) Get(ctx context.Context, id, userID uuid.UUID) (*domain.Idea, error) {
	return domain.RequireOwnership(ctx, func(ctx context.Context) (*domain.Idea, error) {
		return s.ideas.GetByID(ctx, id)
	}, userID)
}

func (s *IdeasService) Create(ctx context.Context, idea *domain.Idea) error {
	return s.ideas.Create(ctx, idea)
}

func (s *IdeasService) Update(ctx context.Context, idea *domain.Idea, userID uuid.UUID) error {
	if _, err := domain.RequireOwnership(ctx, func(ctx context.Context) (*domain.Idea, error) {
		return s.ideas.GetByID(ctx, idea.ID)
	}, userID); err != nil {
		return err
	}
	return s.ideas.Update(ctx, idea)
}

func (s *IdeasService) Archive(ctx context.Context, id, userID uuid.UUID) error {
	if _, err := domain.RequireOwnership(ctx, func(ctx context.Context) (*domain.Idea, error) {
		return s.ideas.GetByID(ctx, id)
	}, userID); err != nil {
		return err
	}
	return s.ideas.Archive(ctx, id)
}

func (s *IdeasService) AddTag(ctx context.Context, id, userID uuid.UUID, label string) error {
	if _, err := domain.RequireOwnership(ctx, func(ctx context.Context) (*domain.Idea, error) {
		return s.ideas.GetByID(ctx, id)
	}, userID); err != nil {
		return err
	}
	return s.ideas.AddTag(ctx, id, label, userID)
}

func (s *IdeasService) RemoveTag(ctx context.Context, id, userID uuid.UUID, label string) error {
	if _, err := domain.RequireOwnership(ctx, func(ctx context.Context) (*domain.Idea, error) {
		return s.ideas.GetByID(ctx, id)
	}, userID); err != nil {
		return err
	}
	return s.ideas.RemoveTag(ctx, id, label, userID)
}

// PromoteToArticle creates an Article from an Idea.
// It validates ownership, creates a GeneratedContent in BUILDING,
// links the Article to the Idea via idea_articles, and returns
// the created Article. The Idea status is not modified.
//
// If LinkArticle fails, the error is explicit — the caller receives
// the error and no incomplete state is returned as success.
func (s *IdeasService) PromoteToArticle(ctx context.Context, ideaID, userID uuid.UUID) (*domain.GeneratedContent, error) {
	if _, err := domain.RequireOwnership(ctx, func(ctx context.Context) (*domain.Idea, error) {
		return s.ideas.GetByID(ctx, ideaID)
	}, userID); err != nil {
		return nil, err
	}

	article := &domain.GeneratedContent{
		UserID:   userID,
		Type:     domain.ContentTypeArticle,
		Product:  domain.ProductCompose,
		Status:   domain.ContentBuilding,
		Origin:   domain.OriginManual,
		Metadata: json.RawMessage("{}"),
	}
	if err := s.content.Create(ctx, article); err != nil {
		return nil, fmt.Errorf("create article: %w", err)
	}

	if err := s.ideas.LinkArticle(ctx, ideaID, article.ID); err != nil {
		// Link failed after article was created. Best-effort cleanup via SoftDelete
		// avoids most orphaned articles. This is not transactional — if SoftDelete
		// also fails, the article exists but is unlinked (no data loss, just
		// missing provenance).
		if delErr := s.content.SoftDelete(ctx, article.ID); delErr != nil {
			slog.Error("promote: link+cleanup failed", "idea_id", ideaID, "content_id", article.ID, "link_err", err, "delete_err", delErr)
		}
		return nil, fmt.Errorf("link article to idea: %w", err)
	}
	return article, nil
}
