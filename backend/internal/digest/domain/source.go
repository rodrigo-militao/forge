// Package domain holds Digest-specific entities and business logic.
package domain

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// SourceType enumerates content source kinds.
type SourceType string

const (
	SourceTypeRSS       SourceType = "rss"
	SourceTypeWebSearch SourceType = "web_search"
)

// SourceConfig represents a configured content source for a tenant.
type SourceConfig struct {
	ID        uuid.UUID       `json:"id"`
	UserID    uuid.UUID       `json:"user_id"`
	Name      string          `json:"name"`
	Type      SourceType      `json:"type"`
	Config    json.RawMessage `json:"config"`
	Enabled   bool            `json:"enabled"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

// SourceItem is an article fetched from a content source.
type SourceItem struct {
	Title       string
	URL         string
	Content     string
	Summary     string
	PublishedAt time.Time
	SourceName  string
	SourceURL   string
}

// ContentSource is the interface for fetching articles from a source.
type ContentSource interface {
	Name() string
	Fetch(ctx context.Context) ([]SourceItem, error)
}

// FilterConfig contains content filtering rules for a discovery run.
type FilterConfig struct {
	MinScore          int
	MaxItemsPerDigest int
}

// SourceRepository persists content source configurations per tenant.
type SourceRepository interface {
	ListByUser(ctx context.Context, userID uuid.UUID) ([]SourceConfig, error)
	Create(ctx context.Context, userID uuid.UUID, name string, sourceType SourceType, config json.RawMessage) (*SourceConfig, error)
	Update(ctx context.Context, id uuid.UUID, userID uuid.UUID, name string, sourceType SourceType, config json.RawMessage, enabled bool) (*SourceConfig, error)
	Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error
}
