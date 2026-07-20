package application

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// ReferenceService coordinates Reference use cases (Sprint 3).
type ReferenceService struct {
	refs    ports.ReferenceRepository
	ideas   ports.IdeaRepository
	content ports.ContentReader
}

func NewReferenceService(refs ports.ReferenceRepository, ideas ports.IdeaRepository, content ports.ContentReader) *ReferenceService {
	return &ReferenceService{refs: refs, ideas: ideas, content: content}
}

// --- CRUD ---

func (s *ReferenceService) CreateReference(ctx context.Context, userID uuid.UUID, url, title, description, sourceName *string, refType domain.ReferenceType) (*domain.Reference, error) {
	urlVal := ""
	if url != nil {
		urlVal = *url
	}
	if err := domain.ValidateReference(urlVal, refType); err != nil {
		return nil, err
	}

	ref := &domain.Reference{
		UserID:        userID,
		URL:           urlVal,
		Title:         title,
		Description:   description,
		SourceName:    sourceName,
		ReferenceType: refType,
	}
	if err := s.refs.Create(ctx, ref); err != nil {
		return nil, fmt.Errorf("create reference: %w", err)
	}
	return ref, nil
}

func (s *ReferenceService) GetReference(ctx context.Context, id, userID uuid.UUID) (*domain.Reference, error) {
	ref, err := s.refs.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if ref.UserID != userID {
		return nil, fmt.Errorf("%w: reference %s", domain.ErrNotOwned, id)
	}
	return ref, nil
}

func (s *ReferenceService) ListReferences(ctx context.Context, userID uuid.UUID) ([]domain.Reference, error) {
	return s.refs.ListByUser(ctx, userID)
}

func (s *ReferenceService) UpdateReference(ctx context.Context, id, userID uuid.UUID, url, title, description, sourceName *string, refType domain.ReferenceType) (*domain.Reference, error) {
	if _, err := s.GetReference(ctx, id, userID); err != nil {
		return nil, err
	}
	urlVal := ""
	if url != nil {
		urlVal = *url
	}
	if err := domain.ValidateReference(urlVal, refType); err != nil {
		return nil, err
	}
	ref := &domain.Reference{
		ID:            id,
		URL:           urlVal,
		Title:         title,
		Description:   description,
		SourceName:    sourceName,
		ReferenceType: refType,
	}
	if err := s.refs.Update(ctx, ref); err != nil {
		return nil, fmt.Errorf("update reference: %w", err)
	}
	return ref, nil
}

func (s *ReferenceService) DeleteReference(ctx context.Context, id, userID uuid.UUID) error {
	ref, err := s.refs.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if ref.UserID != userID {
		return fmt.Errorf("%w: reference %s", domain.ErrNotOwned, id)
	}
	return s.refs.Delete(ctx, id)
}

// --- Idea relationships ---

func (s *ReferenceService) AttachReferenceToIdea(ctx context.Context, ideaID, referenceID, userID uuid.UUID) error {
	idea, err := s.ideas.GetByID(ctx, ideaID)
	if err != nil {
		return fmt.Errorf("get idea: %w", err)
	}
	if idea.UserID != userID {
		return fmt.Errorf("%w: idea %s", domain.ErrNotOwned, ideaID)
	}
	ref, err := s.refs.GetByID(ctx, referenceID)
	if err != nil {
		return fmt.Errorf("get reference: %w", err)
	}
	if ref.UserID != userID {
		return fmt.Errorf("%w: reference %s", domain.ErrNotOwned, referenceID)
	}
	return s.refs.AttachToIdea(ctx, ideaID, referenceID)
}

func (s *ReferenceService) DetachReferenceFromIdea(ctx context.Context, ideaID, referenceID, userID uuid.UUID) error {
	idea, err := s.ideas.GetByID(ctx, ideaID)
	if err != nil {
		return fmt.Errorf("get idea: %w", err)
	}
	if idea.UserID != userID {
		return fmt.Errorf("%w: idea %s", domain.ErrNotOwned, ideaID)
	}
	ref, err := s.refs.GetByID(ctx, referenceID)
	if err != nil {
		return fmt.Errorf("get reference: %w", err)
	}
	if ref.UserID != userID {
		return fmt.Errorf("%w: reference %s", domain.ErrNotOwned, referenceID)
	}
	return s.refs.DetachFromIdea(ctx, ideaID, referenceID)
}

func (s *ReferenceService) ListIdeaReferences(ctx context.Context, ideaID, userID uuid.UUID) ([]domain.Reference, error) {
	idea, err := s.ideas.GetByID(ctx, ideaID)
	if err != nil {
		return nil, fmt.Errorf("get idea: %w", err)
	}
	if idea.UserID != userID {
		return nil, fmt.Errorf("%w: idea %s", domain.ErrNotOwned, ideaID)
	}
	return s.refs.ListByIdea(ctx, ideaID)
}

// --- Article relationships ---

func (s *ReferenceService) AttachReferenceToArticle(ctx context.Context, contentID, referenceID, userID uuid.UUID) error {
	content, err := s.content.GetByID(ctx, contentID)
	if err != nil {
		return fmt.Errorf("get content: %w", err)
	}
	if content.UserID != userID {
		return fmt.Errorf("%w: content %s", domain.ErrNotOwned, contentID)
	}
	if content.Type != domain.ContentTypeArticle {
		return fmt.Errorf("%w: content %s is not an article", domain.ErrInvalidInput, contentID)
	}
	ref, err := s.refs.GetByID(ctx, referenceID)
	if err != nil {
		return fmt.Errorf("get reference: %w", err)
	}
	if ref.UserID != userID {
		return fmt.Errorf("%w: reference %s", domain.ErrNotOwned, referenceID)
	}
	return s.refs.AttachToContent(ctx, contentID, referenceID)
}

func (s *ReferenceService) DetachReferenceFromArticle(ctx context.Context, contentID, referenceID, userID uuid.UUID) error {
	content, err := s.content.GetByID(ctx, contentID)
	if err != nil {
		return fmt.Errorf("get content: %w", err)
	}
	if content.UserID != userID {
		return fmt.Errorf("%w: content %s", domain.ErrNotOwned, contentID)
	}
	ref, err := s.refs.GetByID(ctx, referenceID)
	if err != nil {
		return fmt.Errorf("get reference: %w", err)
	}
	if ref.UserID != userID {
		return fmt.Errorf("%w: reference %s", domain.ErrNotOwned, referenceID)
	}
	return s.refs.DetachFromContent(ctx, contentID, referenceID)
}

func (s *ReferenceService) ListArticleReferences(ctx context.Context, contentID, userID uuid.UUID) ([]domain.Reference, error) {
	content, err := s.content.GetByID(ctx, contentID)
	if err != nil {
		return nil, fmt.Errorf("get content: %w", err)
	}
	if content.UserID != userID {
		return nil, fmt.Errorf("%w: content %s", domain.ErrNotOwned, contentID)
	}
	return s.refs.ListByContent(ctx, contentID)
}
