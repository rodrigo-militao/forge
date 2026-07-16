package application

import (
	"context"
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
// delegates CRUD operations. Plan limit enforcement is handled by Plans.
type ContentService struct {
	reader     ports.ContentReader
	writer     ports.ContentWriter
	categorizer ports.ContentCategorizer
	tagger     ports.ContentTagger
	source     SourceLinker
}

// NewContentService creates a content service.
func NewContentService(reader ports.ContentReader, writer ports.ContentWriter, categorizer ports.ContentCategorizer, tagger ports.ContentTagger, source SourceLinker) *ContentService {
	return &ContentService{reader: reader, writer: writer, categorizer: categorizer, tagger: tagger, source: source}
}

// GetOwnedContent fetches content and verifies the requesting user owns it.
func (s *ContentService) GetOwnedContent(ctx context.Context, id uuid.UUID, userID uuid.UUID) (*domain.GeneratedContent, error) {
	content, err := s.reader.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get content: %w", err)
	}
	if content.UserID != userID {
		return nil, fmt.Errorf("not your content")
	}
	return content, nil
}

func (s *ContentService) ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.GeneratedContent, error) {
	return s.reader.ListByUser(ctx, userID)
}

func (s *ContentService) UpdateBody(ctx context.Context, id uuid.UUID, title, bodyMarkdown *string) error {
	return s.writer.UpdateBody(ctx, id, title, bodyMarkdown)
}

func (s *ContentService) UpdateOutline(ctx context.Context, id uuid.UUID, outline *string) error {
	return s.writer.UpdateOutline(ctx, id, outline)
}

func (s *ContentService) LinkSource(ctx context.Context, contentID, sourceID uuid.UUID) error {
	return s.source.SetContentSource(ctx, contentID, sourceID)
}

func (s *ContentService) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.ContentStatus) error {
	return s.writer.UpdateStatus(ctx, id, status)
}

func (s *ContentService) SoftDelete(ctx context.Context, id uuid.UUID) error {
	return s.writer.SoftDelete(ctx, id)
}

func (s *ContentService) AddCategory(ctx context.Context, id uuid.UUID, category string) error {
	return s.categorizer.AddCategory(ctx, id, category)
}

func (s *ContentService) RemoveCategory(ctx context.Context, id uuid.UUID, category string) error {
	return s.categorizer.RemoveCategory(ctx, id, category)
}

func (s *ContentService) SetCategories(ctx context.Context, id uuid.UUID, categories []string) error {
	return s.categorizer.SetCategories(ctx, id, categories)
}

func (s *ContentService) ListCategories(ctx context.Context, userID uuid.UUID) ([]string, error) {
	return s.categorizer.ListUserCategories(ctx, userID)
}

func (s *ContentService) AddTag(ctx context.Context, id uuid.UUID, tag string) error {
	return s.tagger.AddTag(ctx, id, tag)
}

func (s *ContentService) RemoveTag(ctx context.Context, id uuid.UUID, tag string) error {
	return s.tagger.RemoveTag(ctx, id, tag)
}

func (s *ContentService) ListTags(ctx context.Context, userID uuid.UUID) ([]string, error) {
	return s.tagger.ListUserTags(ctx, userID)
}

