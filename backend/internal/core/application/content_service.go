package application

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// ContentService wraps ContentRepository with ownership verification and
// delegates CRUD operations. Plan limit enforcement is handled by Plans.
type ContentService struct {
	content ports.ContentRepository
}

// NewContentService creates a content service.
func NewContentService(content ports.ContentRepository) *ContentService {
	return &ContentService{content: content}
}

// GetOwnedContent fetches content and verifies the requesting user owns it.
func (s *ContentService) GetOwnedContent(ctx context.Context, id uuid.UUID, userID uuid.UUID) (*domain.GeneratedContent, error) {
	content, err := s.content.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get content: %w", err)
	}
	if content.UserID != userID {
		return nil, fmt.Errorf("not your content")
	}
	return content, nil
}

func (s *ContentService) ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.GeneratedContent, error) {
	return s.content.ListByUser(ctx, userID)
}

func (s *ContentService) UpdateBody(ctx context.Context, id uuid.UUID, title, bodyMarkdown *string) error {
	return s.content.UpdateBody(ctx, id, title, bodyMarkdown)
}

func (s *ContentService) SoftDelete(ctx context.Context, id uuid.UUID) error {
	return s.content.SoftDelete(ctx, id)
}

func (s *ContentService) UpdateCategory(ctx context.Context, id uuid.UUID, category *string) error {
	if category != nil && *category == "" {
		category = nil
	}
	return s.content.UpdateCategory(ctx, id, category)
}

func (s *ContentService) AddTag(ctx context.Context, id uuid.UUID, tag string) error {
	return s.content.AddTag(ctx, id, tag)
}

func (s *ContentService) RemoveTag(ctx context.Context, id uuid.UUID, tag string) error {
	return s.content.RemoveTag(ctx, id, tag)
}

func (s *ContentService) ListTags(ctx context.Context, userID uuid.UUID) ([]string, error) {
	return s.content.ListUserTags(ctx, userID)
}

// Plans provides plan limit checking shared across handlers.
type Plans struct {
	users ports.UserRepository
}

// NewPlans creates a plan limit checker.
func NewPlans(users ports.UserRepository) *Plans {
	return &Plans{users: users}
}

// CheckMonthGenerationQuota returns an error if the user has exceeded their monthly limit.
func (p *Plans) CheckMonthGenerationQuota(ctx context.Context, userID uuid.UUID, usages ports.UsageCounterRepository) error {
	user, err := p.users.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to check quota: %w", err)
	}
	used, err := usages.Get(ctx, userID, "")
	if err != nil {
		used = 0
	}
	if used >= user.MaxMonthlyGenerations {
		return &LimitError{Name: "monthly_generation", Limit: user.MaxMonthlyGenerations, Current: used}
	}
	return nil
}

// CheckSourceLimit returns an error if enabling another source would exceed the user's plan.
func (p *Plans) CheckSourceLimit(ctx context.Context, userID uuid.UUID, enabledCount int) error {
	user, err := p.users.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to check source limit: %w", err)
	}
	if enabledCount >= user.MaxActiveSources {
		return &LimitError{Name: "max_active_sources", Limit: user.MaxActiveSources, Current: enabledCount}
	}
	return nil
}

// CheckInterestLimit returns an error if enabling another interest would exceed the user's plan.
func (p *Plans) CheckInterestLimit(ctx context.Context, userID uuid.UUID, enabledCount int) error {
	user, err := p.users.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to check interest limit: %w", err)
	}
	if enabledCount >= user.MaxActiveInterests {
		return &LimitError{Name: "max_active_interests", Limit: user.MaxActiveInterests, Current: enabledCount}
	}
	return nil
}

// LimitError is returned when a plan limit is exceeded.
type LimitError struct {
	Name    string
	Limit   int
	Current int
}

func (e *LimitError) Error() string {
	return fmt.Sprintf("%s limit reached (%d/%d)", e.Name, e.Current, e.Limit)
}

func (e *LimitError) Code() string { return "plan_limit" }
