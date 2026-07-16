package application

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

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
