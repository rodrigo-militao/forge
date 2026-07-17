package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ContentStatus tracks the content lifecycle.
type ContentStatus string

const (
	ContentDraft     ContentStatus = "draft"
	ContentPublished ContentStatus = "published"
	ContentDiscarded ContentStatus = "discarded"
)

// CanTransitionTo returns true if the transition to the target status is allowed.
// Content moves forward: draft → published → discarded. Discarded is terminal.
func (s ContentStatus) CanTransitionTo(target ContentStatus) bool {
	if s == ContentDiscarded {
		return false
	}
	return s != target
}

// ValidContentStatuses returns all valid content statuses.
func ValidContentStatuses() []ContentStatus {
	return []ContentStatus{ContentDraft, ContentPublished, ContentDiscarded}
}

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

// GeneratedContent is shared output from any product (Digest or Compose).
type GeneratedContent struct {
	ID           uuid.UUID       `json:"id"`
	UserID       uuid.UUID       `json:"user_id"`
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
