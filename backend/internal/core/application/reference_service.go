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
	content ports.ContentRepository
}

func NewReferenceService(refs ports.ReferenceRepository, ideas ports.IdeaRepository, content ports.ContentRepository) *ReferenceService {
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
	return domain.RequireOwnership(ctx, func(ctx context.Context) (*domain.Reference, error) {
		return s.refs.GetByID(ctx, id)
	}, userID)
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
	if _, err := domain.RequireOwnership(ctx, func(ctx context.Context) (*domain.Reference, error) {
		return s.refs.GetByID(ctx, id)
	}, userID); err != nil {
		return err
	}
	return s.refs.Delete(ctx, id)
}

// --- Idea relationships ---

func (s *ReferenceService) AttachReferenceToIdea(ctx context.Context, ideaID, referenceID, userID uuid.UUID) error {
	if _, err := domain.RequireOwnership(ctx, func(ctx context.Context) (*domain.Idea, error) {
		return s.ideas.GetByID(ctx, ideaID)
	}, userID); err != nil {
		return err
	}
	if _, err := domain.RequireOwnership(ctx, func(ctx context.Context) (*domain.Reference, error) {
		return s.refs.GetByID(ctx, referenceID)
	}, userID); err != nil {
		return err
	}
	return s.refs.AttachToIdea(ctx, ideaID, referenceID)
}

func (s *ReferenceService) DetachReferenceFromIdea(ctx context.Context, ideaID, referenceID, userID uuid.UUID) error {
	if _, err := domain.RequireOwnership(ctx, func(ctx context.Context) (*domain.Idea, error) {
		return s.ideas.GetByID(ctx, ideaID)
	}, userID); err != nil {
		return err
	}
	if _, err := domain.RequireOwnership(ctx, func(ctx context.Context) (*domain.Reference, error) {
		return s.refs.GetByID(ctx, referenceID)
	}, userID); err != nil {
		return err
	}
	return s.refs.DetachFromIdea(ctx, ideaID, referenceID)
}

func (s *ReferenceService) ListIdeaReferences(ctx context.Context, ideaID, userID uuid.UUID) ([]domain.Reference, error) {
	if _, err := domain.RequireOwnership(ctx, func(ctx context.Context) (*domain.Idea, error) {
		return s.ideas.GetByID(ctx, ideaID)
	}, userID); err != nil {
		return nil, err
	}
	return s.refs.ListByIdea(ctx, ideaID)
}

// --- Article relationships ---

func (s *ReferenceService) AttachReferenceToArticle(ctx context.Context, contentID, referenceID, userID uuid.UUID) error {
	content, err := domain.RequireOwnership(ctx, func(ctx context.Context) (*domain.GeneratedContent, error) {
		return s.content.GetByID(ctx, contentID)
	}, userID)
	if err != nil {
		return err
	}
	if content.Type != domain.ContentTypeArticle {
		return fmt.Errorf("%w: content %s is not an article", domain.ErrInvalidInput, contentID)
	}
	if _, err := domain.RequireOwnership(ctx, func(ctx context.Context) (*domain.Reference, error) {
		return s.refs.GetByID(ctx, referenceID)
	}, userID); err != nil {
		return err
	}
	return s.refs.AttachToContent(ctx, contentID, referenceID)
}

func (s *ReferenceService) DetachReferenceFromArticle(ctx context.Context, contentID, referenceID, userID uuid.UUID) error {
	if _, err := domain.RequireOwnership(ctx, func(ctx context.Context) (*domain.GeneratedContent, error) {
		return s.content.GetByID(ctx, contentID)
	}, userID); err != nil {
		return err
	}
	if _, err := domain.RequireOwnership(ctx, func(ctx context.Context) (*domain.Reference, error) {
		return s.refs.GetByID(ctx, referenceID)
	}, userID); err != nil {
		return err
	}
	return s.refs.DetachFromContent(ctx, contentID, referenceID)
}

func (s *ReferenceService) ListArticleReferences(ctx context.Context, contentID, userID uuid.UUID) ([]domain.Reference, error) {
	if _, err := domain.RequireOwnership(ctx, func(ctx context.Context) (*domain.GeneratedContent, error) {
		return s.content.GetByID(ctx, contentID)
	}, userID); err != nil {
		return nil, err
	}
	return s.refs.ListByContent(ctx, contentID)
}
