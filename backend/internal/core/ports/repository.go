package ports

import (
	"context"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/domain"
)

// UserRepository persists platform tenants.
type UserRepository interface {
	Create(ctx context.Context, user *domain.User) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
	GetByEmail(ctx context.Context, email string) (*domain.User, error)
	Update(ctx context.Context, user *domain.User) error
}

// ContentRepository persists generated content from both products.
type ContentRepository interface {
	Create(ctx context.Context, content *domain.GeneratedContent) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.GeneratedContent, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.GeneratedContent, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status domain.ContentStatus) error
}

// JobRepository persists the async job queue (ADR 0028).
type JobRepository interface {
	Create(ctx context.Context, job *domain.Job) error
	ClaimNext(ctx context.Context) (*domain.Job, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status domain.JobStatus, errMsg *string) error
}
