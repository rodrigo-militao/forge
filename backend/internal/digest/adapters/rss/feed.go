// Package rss implements digest.ContentSource for RSS/Atom feeds.
package rss

import (
	"context"
	"fmt"
	"time"

	"github.com/mmcdole/gofeed"

	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

// Feed implements models.ContentSource for RSS/Atom feeds.
type Feed struct {
	name   string
	url    string
	parser *gofeed.Parser
}

// NewFeed creates a new RSS feed source.
func NewFeed(name, url string) *Feed {
	return &Feed{
		name:   name,
		url:    url,
		parser: gofeed.NewParser(),
	}
}

// Name returns the human-readable feed name.
func (f *Feed) Name() string {
	return f.name
}

// Fetch retrieves articles published within the last 24 hours.
func (f *Feed) Fetch(ctx context.Context) ([]digest.SourceItem, error) {
	feed, err := f.parser.ParseURLWithContext(f.url, ctx)
	if err != nil {
		return nil, fmt.Errorf("parsing feed %s: %w", f.url, err)
	}

	since := time.Now().Add(-24 * time.Hour)

	var articles []digest.SourceItem
	seen := make(map[string]bool)

	for _, item := range feed.Items {
		id := item.GUID
		if id == "" {
			id = item.Link
		}
		if id == "" || seen[id] {
			continue
		}
		seen[id] = true

		var publishedAt time.Time
		if item.PublishedParsed != nil {
			publishedAt = *item.PublishedParsed
		} else if item.UpdatedParsed != nil {
			publishedAt = *item.UpdatedParsed
		}

		if !publishedAt.IsZero() {
			if publishedAt.Before(since) {
				continue
			}
		}

		articles = append(articles, digest.SourceItem{
			Title:       item.Title,
			URL:         item.Link,
			Content:     item.Description,
			Summary:     item.Description,
			PublishedAt: publishedAt,
			SourceName:  f.name,
			SourceURL:   f.url,
		})
	}

	return articles, nil
}
