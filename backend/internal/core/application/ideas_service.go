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
	ideas  ports.IdeaRepository
	writer ports.ContentWriter
}

func NewIdeasService(ideas ports.IdeaRepository, writer ports.ContentWriter) *IdeasService {
	return &IdeasService{ideas: ideas, writer: writer}
}

// PromoteToArticle creates an Article from an Idea.
// It validates ownership, creates a GeneratedContent in BUILDING,
// links the Article to the Idea via idea_articles, and returns
// the created Article. The Idea status is not modified.
//
// If LinkArticle fails, the error is explicit — the caller receives
// the error and no incomplete state is returned as success.
func (s *IdeasService) PromoteToArticle(ctx context.Context, ideaID, userID uuid.UUID) (*domain.GeneratedContent, error) {
	idea, err := s.ideas.GetByID(ctx, ideaID)
	if err != nil {
		return nil, fmt.Errorf("get idea: %w", err)
	}
	if idea.UserID != userID {
		return nil, fmt.Errorf("%w: idea %s", domain.ErrNotOwned, ideaID)
	}

	article := &domain.GeneratedContent{
		UserID:   userID,
		Type:     domain.ContentTypeArticle,
		Product:  domain.ProductCompose,
		Status:   domain.ContentBuilding,
		Origin:   domain.OriginManual,
		Metadata: json.RawMessage("{}"),
	}
	if err := s.writer.Create(ctx, article); err != nil {
		return nil, fmt.Errorf("create article: %w", err)
	}

	if err := s.ideas.LinkArticle(ctx, ideaID, article.ID); err != nil {
		// Link failed after article was created. Best-effort cleanup via SoftDelete
		// avoids most orphaned articles. This is not transactional — if SoftDelete
		// also fails, the article exists but is unlinked (no data loss, just
		// missing provenance).
		if delErr := s.writer.SoftDelete(ctx, article.ID); delErr != nil {
			slog.Error("promote: link+cleanup failed", "idea_id", ideaID, "content_id", article.ID, "link_err", err, "delete_err", delErr)
		}
		return nil, fmt.Errorf("link article to idea: %w", err)
	}
	return article, nil
}
