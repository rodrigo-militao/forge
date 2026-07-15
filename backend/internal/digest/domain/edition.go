package domain

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// EditionStatus tracks the lifecycle of a newsletter edition (ADR 0046).
type EditionStatus string

const (
	EditionBuilding   EditionStatus = "building"
	EditionReady      EditionStatus = "ready"
	EditionPublished  EditionStatus = "published"
	EditionArchived   EditionStatus = "archived"
)

// AllowedTransitions maps each status to the set of statuses it can transition to.
var allowedTransitions = map[EditionStatus]map[EditionStatus]bool{
	EditionBuilding:  {EditionReady: true, EditionArchived: true},
	EditionReady:     {EditionPublished: true, EditionArchived: true},
	EditionPublished: {},
	EditionArchived:  {},
}

// CanTransitionTo returns true if the edition can transition from the current status to the target.
func (s EditionStatus) CanTransitionTo(target EditionStatus) bool {
	if s == target {
		return false
	}
	return allowedTransitions[s][target]
}

// ValidateTransition returns an error if the transition is not allowed.
func (s EditionStatus) ValidateTransition(target EditionStatus) error {
	if !s.CanTransitionTo(target) {
		return fmt.Errorf("cannot transition from %q to %q", s, target)
	}
	return nil
}

// EditionValidStatuses returns all valid edition statuses.
func EditionValidStatuses() []EditionStatus {
	return []EditionStatus{EditionBuilding, EditionReady, EditionPublished, EditionArchived}
}

// Edition is a newsletter edition — a curated collection of digest articles
// assembled into a single editable document (ADR 0046).
type Edition struct {
	ID           uuid.UUID
	UserID       uuid.UUID
	Title        string
	Introduction string // LLM-generated intro / body, editable by user
	Category     *string
	Status       EditionStatus
	Destination  *string // free-text label (e.g. "Substack", "Blog cliente X")
	Tags         []string
	ArticleCount int // populated in dashboard list queries
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
	// Duplicate creates a new building release copying title, destination, and tags (no body, no articles).
	Duplicate(ctx context.Context, editionID uuid.UUID) (*Edition, error)
	// ListArticleCounts returns article count per edition ID for the given edition IDs.
	ListArticleCounts(ctx context.Context, editionIDs []uuid.UUID) (map[uuid.UUID]int, error)
	// UpdateDestination sets or clears the destination label.
	UpdateDestination(ctx context.Context, id uuid.UUID, destination *string) error
	// ListUsedDestinations returns distinct destinations previously used by the tenant.
	ListUsedDestinations(ctx context.Context, userID uuid.UUID) ([]string, error)
}
