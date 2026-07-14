package ports

import (
	"context"
	"time"

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
}

// ContentCategorizer manages categories on content items (ADR 0045).
type ContentCategorizer interface {
	AddCategory(ctx context.Context, id uuid.UUID, category string) error
	RemoveCategory(ctx context.Context, id uuid.UUID, category string) error
	SetCategories(ctx context.Context, id uuid.UUID, categories []string) error
	ListUserCategories(ctx context.Context, userID uuid.UUID) ([]string, error)
}

// ContentDigestReader contains Digest-specific read queries.
type ContentDigestReader interface {
	ExistsByURL(ctx context.Context, userID uuid.UUID, url string) (bool, error)
	ListWithoutCategory(ctx context.Context, userID uuid.UUID, limit int) ([]domain.GeneratedContent, error)
	GetDigestStats(ctx context.Context, userID uuid.UUID) (*DigestStats, error)
}

// ContentTagger manages tags on content items.
type ContentTagger interface {
	AddTag(ctx context.Context, id uuid.UUID, tag string) error
	RemoveTag(ctx context.Context, id uuid.UUID, tag string) error
	ListUserTags(ctx context.Context, userID uuid.UUID) ([]string, error)
}

// DigestStats holds aggregate statistics for the Digest page.
type DigestStats struct {
	TotalCount        int        `json:"total_count"`
	InNewsletterCount int        `json:"in_newsletter_count"`
	LastDiscovery     *time.Time `json:"last_discovery"`
	DraftNewsletters  int        `json:"draft_newsletters"`
}

// ContentRepository combines all content persistence roles for consumers
// that need full access (e.g. ContentHandler).
type ContentRepository interface {
	ContentReader
	ContentWriter
	ContentCategorizer
	ContentDigestReader
	ContentTagger
}

// JobRepository persists the async job queue (ADR 0028).
type JobRepository interface {
	Create(ctx context.Context, job *domain.Job) error
	ClaimNext(ctx context.Context) (*domain.Job, error)
	UpdateStatus(ctx context.Context, id uuid.UUID, status domain.JobStatus, errMsg *string) error
	ListByUser(ctx context.Context, userID uuid.UUID, limit int) ([]domain.Job, error)
	FindActiveByUserAndType(ctx context.Context, userID uuid.UUID, jobType string) (*domain.Job, error)
}

// UserRepository persists user accounts.
type UserRepository interface {
	Create(ctx context.Context, user *domain.User) error
	GetByEmail(ctx context.Context, email string) (*domain.User, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
	CountActiveSources(ctx context.Context, userID uuid.UUID) (int, error)
	CountActiveInterests(ctx context.Context, userID uuid.UUID) (int, error)
	UpdateRestrictSearch(ctx context.Context, userID uuid.UUID, restrict bool) error
	UpdateThemePreference(ctx context.Context, userID uuid.UUID, theme domain.ThemePreference) error
}
