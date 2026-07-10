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
	ID      uuid.UUID
	UserID  uuid.UUID
	Name    string
	Type    SourceType
	Config  json.RawMessage
	Enabled bool
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
