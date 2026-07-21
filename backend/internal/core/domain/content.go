package domain

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// ContentStatus tracks the content lifecycle (Sprint 1).
// The canonical lifecycle is:
//
//	BUILDING → REVIEW
//	REVIEW   → BUILDING
//	REVIEW   → READY
//	READY    → BUILDING
//	READY    → PUBLISHED
//	PUBLISHED → BUILDING (deliberate reopen)
type ContentStatus string

const (
	// --- Active lifecycle statuses ---

	// ContentBuilding is the initial creation/editing state.
	ContentBuilding ContentStatus = "building"
	// ContentReview means the content is submitted for human review.
	ContentReview ContentStatus = "review"
	// ContentReady means the content has been reviewed and is ready for publication.
	ContentReady ContentStatus = "ready"
	// ContentPublished means the content has been published externally.
	ContentPublished ContentStatus = "published"

	// --- Legacy statuses (backward compatibility) ---

	// ContentDraft is a legacy alias. Maps semantically to ContentBuilding.
	// Deprecated: use ContentBuilding instead.
	ContentDraft ContentStatus = "draft"
	// ContentDiscarded is a terminal state in existing data only.
	// No forward transitions to or from this state are allowed.
	// Deprecated: not part of the active Sprint 1 lifecycle.
	ContentDiscarded ContentStatus = "discarded"
)

// CanTransitionTo returns true if the transition from the current status
// to the target status is allowed by the Sprint 1 lifecycle rules.
//
// Legacy statuses (draft, discarded) are normalized:
//   - draft → building (backward compat)
//   - discarded → no transitions allowed (terminal)
func (s ContentStatus) CanTransitionTo(target ContentStatus) bool {
	// Normalize legacy "draft" to "building" for validation.
	normalized := s
	if normalized == ContentDraft {
		normalized = ContentBuilding
	}

	transitions := map[ContentStatus]map[ContentStatus]bool{
		ContentBuilding: {
			ContentReview: true,
		},
		ContentReview: {
			ContentBuilding: true,
			ContentReady:    true,
		},
		ContentReady: {
			ContentBuilding: true,
			ContentPublished: true,
		},
		ContentPublished: {
			ContentBuilding: true, // deliberate reopen
		},
	}

	if allowed, ok := transitions[normalized][target]; ok {
		return allowed
	}
	return false
}

// ValidateTransition returns an error if the transition is not allowed.
func (s ContentStatus) ValidateTransition(target ContentStatus) error {
	if !s.CanTransitionTo(target) {
		return fmt.Errorf("%w: cannot transition from %q to %q", ErrInvalidInput, s, target)
	}
	return nil
}

// ValidContentStatuses returns the active lifecycle statuses.
// Legacy statuses (draft, discarded) are excluded.
func ValidContentStatuses() []ContentStatus {
	return []ContentStatus{ContentBuilding, ContentReview, ContentReady, ContentPublished}
}

// ContentType identifies the kind of publishable content.
type ContentType string

const (
	ContentTypeArticle    ContentType = "article"
	ContentTypeNewsletter ContentType = "newsletter"
)

// ContentProduct identifies which product generated this content.
type ContentProduct string

const (
	ProductDigest     ContentProduct = "digest"
	ProductCompose    ContentProduct = "compose"
	ProductNewsletter ContentProduct = "newsletter"
)

// ContentOrigin tracks how the content was created (ADR 0030).
type ContentOrigin string

const (
	OriginAIGenerated ContentOrigin = "ai_generated"
	OriginManual      ContentOrigin = "manual"
)

// GeneratedContent is the canonical content entity for Articles.
// Newsletters are stored separately as newsletter_editions with shared
// lifecycle semantics.
//
// Sprint 1: The `Type` field distinguishes article from newsletter.
// The `Product` field identifies the originating tool (digest/compose/newsletter).
type GeneratedContent struct {
	ID           uuid.UUID       `json:"id"`
	UserID       uuid.UUID       `json:"user_id"`
	Type         ContentType     `json:"type"`
	Product      ContentProduct  `json:"product"`
	Status       ContentStatus   `json:"status"`
	SourceType   *string         `json:"source_type"`
	Title        *string         `json:"title"`
	BodyMarkdown *string         `json:"body_markdown"`
	Outline      *string         `json:"outline"`
	Metadata     json.RawMessage `json:"metadata"`
	Origin       ContentOrigin   `json:"origin"`
	Categories   []string        `json:"categories"`
	Tags         []string        `json:"tags"`
	DeletedAt    *time.Time      `json:"deleted_at"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
}

func (c *GeneratedContent) GetUserID() uuid.UUID { return c.UserID }

