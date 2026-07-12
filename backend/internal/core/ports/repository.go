package ports

import (
	"context"

	"github.com/google/uuid"

	"github.com/rodrigo-militao/forge/internal/core/domain"
)

// UsageCounterRepository tracks monthly LLM generation usage per tenant.
type UsageCounterRepository interface {
	Get(ctx context.Context, userID uuid.UUID, month string) (int, error)
	Increment(ctx context.Context, userID uuid.UUID, month string) (int, error)
}

// ContentReader persists user-generated content (digest items, articles, editions).
type ContentReader interface {
	GetByID(ctx context.Context, id uuid.UUID) (*domain.GeneratedContent, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.GeneratedContent, error)
}

// ContentWriter creates, updates, and soft-deletes content.
type ContentWriter interface {
	Create(ctx context.Context, content *domain.GeneratedContent) error
	UpdateBody(ctx context.Context, id uuid.UUID, title, bodyMarkdown *string) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status domain.ContentStatus) error
	SoftDelete(ctx context.Context, id uuid.UUID) error
	UpdateCategory(ctx context.Context, id uuid.UUID, category *string) error
}

// ContentDigestReader contains Digest-specific read queries.
type ContentDigestReader interface {
	ExistsByURL(ctx context.Context, userID uuid.UUID, url string) (bool, error)
	ListWithoutCategory(ctx context.Context, userID uuid.UUID, limit int) ([]domain.GeneratedContent, error)
	ListUserCategories(ctx context.Context, userID uuid.UUID) ([]string, error)
	ListApprovedDigest(ctx context.Context, userID uuid.UUID) ([]domain.GeneratedContent, error)
}

// ContentTagger manages tags on content items.
type ContentTagger interface {
	AddTag(ctx context.Context, id uuid.UUID, tag string) error
	RemoveTag(ctx context.Context, id uuid.UUID, tag string) error
	ListUserTags(ctx context.Context, userID uuid.UUID) ([]string, error)
}

// ContentRepository combines all content persistence roles for consumers
// that need full access (e.g. ContentHandler).
type ContentRepository interface {
	ContentReader
	ContentWriter
	ContentDigestReader
	ContentTagger
}

// JobRepository persists the async job queue (ADR 0028).
type JobRepository interface {
	Create(ctx context.Context, job *domain.Job) error
	ClaimNext(ctx context.Context) (*domain.Job, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status domain.JobStatus, errMsg *string) error
}

// UserRepository persists user accounts.
type UserRepository interface {
	Create(ctx context.Context, user *domain.User) error
	GetByEmail(ctx context.Context, email string) (*domain.User, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
	CountActiveSources(ctx context.Context, userID uuid.UUID) (int, error)
	CountActiveInterests(ctx context.Context, userID uuid.UUID) (int, error)
	UpdateRestrictSearch(ctx context.Context, userID uuid.UUID, restrict bool) error
}
