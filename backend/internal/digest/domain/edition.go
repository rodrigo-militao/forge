package domain

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	core "github.com/rodrigo-militao/forge/internal/core/domain"
)

// EditionStatus tracks the lifecycle of a newsletter edition (Sprint 1 lifecycle).
//
// Canonical lifecycle (shared with ContentStatus):
//
//	BUILDING → REVIEW
//	REVIEW   → BUILDING
//	REVIEW   → READY
//	READY    → BUILDING
//	READY    → PUBLISHED
//	PUBLISHED → BUILDING (deliberate reopen)
//
// Archived is a terminal state outside the active lifecycle — existing
// data may be archived, but no forward transitions from archived are allowed.
type EditionStatus string

const (
	EditionBuilding  EditionStatus = "building"
	EditionReview    EditionStatus = "review"
	EditionReady     EditionStatus = "ready"
	EditionPublished EditionStatus = "published"
	EditionArchived  EditionStatus = "archived" // cleanup state — published/ready → archived, archived → building
)

// CanTransitionTo returns true if the transition is allowed by the lifecycle rules.
// Archived is a terminal cleanup state:
//   - published → archived  (archive a published newsletter)
//   - ready → archived      (archive a ready newsletter)
//   - archived → building   (unarchive — reopen for editing)
func (s EditionStatus) CanTransitionTo(target EditionStatus) bool {
	transitions := map[EditionStatus]map[EditionStatus]bool{
		EditionBuilding: {
			EditionReview: true,
		},
		EditionReview: {
			EditionBuilding: true,
			EditionReady:    true,
		},
		EditionReady: {
			EditionBuilding:  true,
			EditionPublished: true,
			EditionArchived:  true,
		},
		EditionPublished: {
			EditionBuilding: true, // deliberate reopen
			EditionArchived: true, // archive
		},
		EditionArchived: {
			EditionBuilding: true, // unarchive
		},
	}

	if allowed, ok := transitions[s][target]; ok {
		return allowed
	}
	return false
}

// ValidateTransition returns an error if the transition is not allowed.
func (s EditionStatus) ValidateTransition(target EditionStatus) error {
	if !s.CanTransitionTo(target) {
		return fmt.Errorf("%w: cannot transition from %q to %q", core.ErrInvalidInput, s, target)
	}
	return nil
}

// EditionValidStatuses returns the active lifecycle statuses.
// EditionArchived is excluded from valid statuses because archiving is a
// cleanup action outside the main lifecycle, not a forward destination.
func EditionValidStatuses() []EditionStatus {
	return []EditionStatus{EditionBuilding, EditionReview, EditionReady, EditionPublished}
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
