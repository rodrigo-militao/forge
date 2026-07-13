package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// EditionStatus tracks the lifecycle of a newsletter edition.
type EditionStatus string

const (
	EditionDraft     EditionStatus = "draft"
	EditionPublished EditionStatus = "published"
	EditionDiscarded EditionStatus = "discarded"
)

// Edition is a newsletter edition — a curated collection of digest articles
// assembled into a single editable document.
type Edition struct {
	ID           uuid.UUID
	UserID       uuid.UUID
	Title        string
	Introduction string // LLM-generated intro / body, editable by user
	Category     *string
	Status       EditionStatus
	Tags         []string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// ArticleRef is a reference to a digest article linked to a newsletter.
type ArticleRef struct {
	ContentID    uuid.UUID `json:"content_id"`
	Title        string    `json:"title"`
	BodyMarkdown string    `json:"body_markdown"`
	AddedAt      string    `json:"added_at"`
}

// EditionRepository persists newsletter editions.
type EditionRepository interface {
	Create(ctx context.Context, edition *Edition) error
	GetByID(ctx context.Context, id uuid.UUID) (*Edition, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]Edition, error)
	ListByUserFiltered(ctx context.Context, userID uuid.UUID, status, category *string) ([]Edition, error)
	UpdateBody(ctx context.Context, id uuid.UUID, title, introduction string) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status EditionStatus) error
	UpdateCategory(ctx context.Context, id uuid.UUID, category *string) error
	AddTag(ctx context.Context, editionID uuid.UUID, tag string) error
	RemoveTag(ctx context.Context, editionID uuid.UUID, tag string) error
	AddArticle(ctx context.Context, newsletterID, contentID uuid.UUID) error
	RemoveArticle(ctx context.Context, newsletterID, contentID uuid.UUID) error
	ListArticles(ctx context.Context, editionID uuid.UUID) ([]ArticleRef, error)
	// ListArticleIDsInAnyNewsletter returns content_ids present in any newsletter.
	ListArticleIDsInAnyNewsletter(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error)
}
