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

// ContentRepository is the unified persistence interface for GeneratedContent,
// covering CRUD, lifecycle, categories, tags, digest queries, and ownership checks.
// A single concrete type (*postgres.ContentRepository) implements all methods.
type ContentRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*domain.GeneratedContent, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.GeneratedContent, error)
	ListByUserFiltered(ctx context.Context, userID uuid.UUID, product, status *string) ([]domain.GeneratedContent, error)
	Create(ctx context.Context, content *domain.GeneratedContent) error
	UpdateBody(ctx context.Context, id uuid.UUID, title, bodyMarkdown *string) error
	UpdateOutline(ctx context.Context, id uuid.UUID, outline *string) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status domain.ContentStatus) error
	UpdateStatusWithPublishedAt(ctx context.Context, id uuid.UUID, status domain.ContentStatus) error
	SoftDelete(ctx context.Context, id uuid.UUID) error
	AddCategory(ctx context.Context, id uuid.UUID, category string) error
	RemoveCategory(ctx context.Context, id uuid.UUID, category string) error
	SetCategories(ctx context.Context, id uuid.UUID, categories []string) error
	ListUserCategories(ctx context.Context, userID uuid.UUID) ([]string, error)
	ExistsByURL(ctx context.Context, userID uuid.UUID, url string) (bool, error)
	ListWithoutCategory(ctx context.Context, userID uuid.UUID, limit int) ([]domain.GeneratedContent, error)
	GetDigestStats(ctx context.Context, userID uuid.UUID) (*DigestStats, error)
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

// IdeaRepository manages the ideas entity.
type IdeaRepository interface {
	Create(ctx context.Context, idea *domain.Idea) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Idea, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.Idea, error)
	Update(ctx context.Context, idea *domain.Idea) error
	Archive(ctx context.Context, id uuid.UUID) error
	AddTag(ctx context.Context, ideaID uuid.UUID, tagLabel string, userID uuid.UUID) error
	RemoveTag(ctx context.Context, ideaID uuid.UUID, tagLabel string, userID uuid.UUID) error
	LinkArticle(ctx context.Context, ideaID uuid.UUID, contentID uuid.UUID) error
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

// ReferenceRepository persists editorial References (Sprint 3).
type ReferenceRepository interface {
	Create(ctx context.Context, ref *domain.Reference) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Reference, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.Reference, error)
	Update(ctx context.Context, ref *domain.Reference) error
	Delete(ctx context.Context, id uuid.UUID) error

	AttachToIdea(ctx context.Context, ideaID, referenceID uuid.UUID) error
	DetachFromIdea(ctx context.Context, ideaID, referenceID uuid.UUID) error
	ListByIdea(ctx context.Context, ideaID uuid.UUID) ([]domain.Reference, error)

	AttachToContent(ctx context.Context, contentID, referenceID uuid.UUID) error
	DetachFromContent(ctx context.Context, contentID, referenceID uuid.UUID) error
	ListByContent(ctx context.Context, contentID uuid.UUID) ([]domain.Reference, error)
}

// AIAnalysisRepository persists and retrieves AI analysis results.
type AIAnalysisRepository interface {
	Create(ctx context.Context, analysis *domain.AIAnalysis) error
	GetLatestByContentID(ctx context.Context, contentID, userID uuid.UUID) (*domain.AIAnalysis, error)
}
