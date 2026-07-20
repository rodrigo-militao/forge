package application

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// SourceLinker sets source_digest_article_id on content or ideas.
type SourceLinker interface {
	SetContentSource(ctx context.Context, contentID, sourceID uuid.UUID) error
}

// ContentService wraps ContentRepository with ownership verification and
// delegates CRUD operations. Every mutation method verifies the requesting
// user owns the content before proceeding. Plan limit enforcement is handled
// by Plans.
type ContentService struct {
	reader      ports.ContentReader
	writer      ports.ContentWriter
	categorizer ports.ContentCategorizer
	tagger      ports.ContentTagger
	source      SourceLinker
}

// NewContentService creates a content service.
func NewContentService(reader ports.ContentReader, writer ports.ContentWriter, categorizer ports.ContentCategorizer, tagger ports.ContentTagger, source SourceLinker) *ContentService {
	return &ContentService{reader: reader, writer: writer, categorizer: categorizer, tagger: tagger, source: source}
}

// requireOwnership fetches content and verifies the requesting user owns it.
// Returns the content if owned, or wraps domain.ErrNotFound or domain.ErrNotOwned.
func (s *ContentService) requireOwnership(ctx context.Context, id, userID uuid.UUID) (*domain.GeneratedContent, error) {
	content, err := s.reader.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get content: %w", err)
	}
	if content.UserID != userID {
		return nil, fmt.Errorf("%w: content %s", domain.ErrNotOwned, id)
	}
	return content, nil
}

// GetOwnedContent fetches content and verifies the requesting user owns it.
func (s *ContentService) GetOwnedContent(ctx context.Context, id uuid.UUID, userID uuid.UUID) (*domain.GeneratedContent, error) {
	return s.requireOwnership(ctx, id, userID)
}

func (s *ContentService) ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.GeneratedContent, error) {
	return s.reader.ListByUser(ctx, userID)
}

func (s *ContentService) UpdateBody(ctx context.Context, id, userID uuid.UUID, title, bodyMarkdown *string) error {
	if _, err := s.requireOwnership(ctx, id, userID); err != nil {
		return err
	}
	return s.writer.UpdateBody(ctx, id, title, bodyMarkdown)
}

func (s *ContentService) UpdateOutline(ctx context.Context, id, userID uuid.UUID, outline *string) error {
	if _, err := s.requireOwnership(ctx, id, userID); err != nil {
		return err
	}
	return s.writer.UpdateOutline(ctx, id, outline)
}

func (s *ContentService) LinkSource(ctx context.Context, contentID, sourceID, userID uuid.UUID) error {
	if _, err := s.requireOwnership(ctx, contentID, userID); err != nil {
		return err
	}
	return s.source.SetContentSource(ctx, contentID, sourceID)
}

// CreateBlankArticle creates a new Article in BUILDING status.
// Title and body are initially empty and set through UpdateBody.
func (s *ContentService) CreateBlankArticle(ctx context.Context, userID uuid.UUID) (*domain.GeneratedContent, error) {
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
	return article, nil
}

// TransitionStatus transitions content to the target status, validating the
// transition against the Sprint 1 lifecycle rules.
// If the target is "published", it also sets published_at.
func (s *ContentService) TransitionStatus(ctx context.Context, id, userID uuid.UUID, target domain.ContentStatus) error {
	content, err := s.requireOwnership(ctx, id, userID)
	if err != nil {
		return err
	}
	if err := content.Status.ValidateTransition(target); err != nil {
		return err
	}
	// Set published_at on first publish
	if target == domain.ContentPublished && content.Status != domain.ContentPublished {
		return s.writer.UpdateStatusWithPublishedAt(ctx, id, target)
	}
	return s.writer.UpdateStatus(ctx, id, target)
}

// UpdateStatus updates content status directly.
// Deprecated: use TransitionStatus for lifecycle-aware transitions.
func (s *ContentService) UpdateStatus(ctx context.Context, id, userID uuid.UUID, status domain.ContentStatus) error {
	if _, err := s.requireOwnership(ctx, id, userID); err != nil {
		return err
	}
	return s.writer.UpdateStatus(ctx, id, status)
}

func (s *ContentService) SoftDelete(ctx context.Context, id, userID uuid.UUID) error {
	if _, err := s.requireOwnership(ctx, id, userID); err != nil {
		return err
	}
	return s.writer.SoftDelete(ctx, id)
}

func (s *ContentService) AddCategory(ctx context.Context, id, userID uuid.UUID, category string) error {
	if _, err := s.requireOwnership(ctx, id, userID); err != nil {
		return err
	}
	return s.categorizer.AddCategory(ctx, id, category)
}

func (s *ContentService) RemoveCategory(ctx context.Context, id, userID uuid.UUID, category string) error {
	if _, err := s.requireOwnership(ctx, id, userID); err != nil {
		return err
	}
	return s.categorizer.RemoveCategory(ctx, id, category)
}

func (s *ContentService) SetCategories(ctx context.Context, id, userID uuid.UUID, categories []string) error {
	if _, err := s.requireOwnership(ctx, id, userID); err != nil {
		return err
	}
	return s.categorizer.SetCategories(ctx, id, categories)
}

func (s *ContentService) ListCategories(ctx context.Context, userID uuid.UUID) ([]string, error) {
	return s.categorizer.ListUserCategories(ctx, userID)
}

func (s *ContentService) AddTag(ctx context.Context, id, userID uuid.UUID, tag string) error {
	if _, err := s.requireOwnership(ctx, id, userID); err != nil {
		return err
	}
	return s.tagger.AddTag(ctx, id, tag)
}

func (s *ContentService) RemoveTag(ctx context.Context, id, userID uuid.UUID, tag string) error {
	if _, err := s.requireOwnership(ctx, id, userID); err != nil {
		return err
	}
	return s.tagger.RemoveTag(ctx, id, tag)
}

func (s *ContentService) ListTags(ctx context.Context, userID uuid.UUID) ([]string, error) {
	return s.tagger.ListUserTags(ctx, userID)
}

