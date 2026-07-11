package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// DigestInterest is a topic/keyword the user wants to curate (ADR 0032).
// Separate from Topic (Compose product's topic generator).
type DigestInterest struct {
	ID        uuid.UUID `json:"id"`
	UserID    uuid.UUID `json:"user_id"`
	Label     string    `json:"label"`
	CreatedAt time.Time `json:"created_at"`
}

// DigestInterestRepository persists digest interests.
type DigestInterestRepository interface {
	ListByUser(ctx context.Context, userID uuid.UUID) ([]DigestInterest, error)
	Create(ctx context.Context, userID uuid.UUID, label string) (*DigestInterest, error)
	Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
}
