package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ContentStatus tracks the human-review lifecycle (ADR 0005).
type ContentStatus string

const (
	ContentDraft    ContentStatus = "draft"
	ContentApproved ContentStatus = "approved"
	ContentRejected ContentStatus = "rejected"
)

// ContentProduct identifies which product generated this content.
type ContentProduct string

const (
	ProductDigest  ContentProduct = "digest"
	ProductCompose ContentProduct = "compose"
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
	Metadata     json.RawMessage `json:"metadata"`
	CreatedAt    time.Time       `json:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at"`
}
