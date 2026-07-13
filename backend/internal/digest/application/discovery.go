// Package application orchestrates Digest use cases.
package application

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

// DiscoveryService orchestrates the daily content curation pipeline:
// fetch sources → classify via LLM → persist digest.
type DiscoveryService struct {
	llm     ports.LLMClient
	sources []digest.ContentSource
	content       ports.ContentWriter
	digestQueries ports.ContentDigestReader
	userID        uuid.UUID
}

// NewDiscoveryService creates a discovery service.
func NewDiscoveryService(llm ports.LLMClient, sources []digest.ContentSource, content ports.ContentWriter, digestQueries ports.ContentDigestReader, userID uuid.UUID) *DiscoveryService {
	return &DiscoveryService{
		llm:           llm,
		sources:       sources,
		content:       content,
		digestQueries: digestQueries,
		userID:        userID,
	}
}

// RunResult contains metrics for a discovery run.
type RunResult struct {
	TotalArticles int
	HighCount     int
	MediumCount   int
}

// Run executes one discovery cycle.
func (s *DiscoveryService) Run(ctx context.Context, date time.Time) (*RunResult, error) {
	articles := s.fetchFromSources(ctx)
	if len(articles) == 0 {
		return nil, fmt.Errorf("no articles found from any source")
	}

	prompt := BuildDiscoveryPrompt(articles)
	resp, err := s.llm.Complete(ctx, domain.LLMRequest{
		SystemPrompt: discoverySystemPrompt,
		Messages:     []domain.LLMMessage{{Role: "user", Content: prompt}},
		MaxTokens:    4096,
		Temperature:  0.3,
	})
	if err != nil {
		return nil, fmt.Errorf("LLM classification: %w", err)
	}

	slog.Info("LLM classification response",
		"total_articles", len(articles),
		"response", resp.Content,
	)

	high, medium := ParseDiscoveryResponse(resp.Content, articles)

	slog.Info("digest classification complete",
		"high_count", len(high),
		"medium_count", len(medium),
	)

	if len(high) == 0 && len(medium) == 0 {
		slog.Warn("no items classified — persisting nothing",
			"response_preview", truncate(resp.Content, 500),
		)
	}

	// Persist each high/medium item as generated_content with status=draft
	persistItem := func(item digest.DigestItem) error {
		summary := item.Summary

		// Skip if URL already exists for this user (dedup across runs)
		if item.URL != "" {
			exists, err := s.digestQueries.ExistsByURL(ctx, s.userID, item.URL)
			if err != nil {
				slog.Warn("url dedup check failed, proceeding anyway",
					"url", item.URL, "error", err)
			} else if exists {
				slog.Info("skipping duplicate URL", "url", item.URL, "title", item.Title)
				return nil
			}
		}

		meta := buildMetadata(item)
		return s.content.Create(ctx, &domain.GeneratedContent{
			UserID:       s.userID,
			Product:      domain.ProductDigest,
			Status:       domain.ContentDraft,
			SourceType:   strPtr("discovery"),
			Title:        &item.Title,
			BodyMarkdown: &summary,
			Metadata:     meta,
		})
	}
	for _, item := range high {
		slog.Info("persisting digest item",
			"title", item.Title,
			"summary_len", len(item.Summary),
			"score", item.Score,
		)
		if err := persistItem(item); err != nil {
			return nil, fmt.Errorf("persisting digest item: %w", err)
		}
	}
	for _, item := range medium {
		if err := persistItem(item); err != nil {
			return nil, fmt.Errorf("persisting digest item: %w", err)
		}
	}

	return &RunResult{
		TotalArticles: len(articles),
		HighCount:     len(high),
		MediumCount:   len(medium),
	}, nil
}

func (s *DiscoveryService) fetchFromSources(ctx context.Context) []digest.SourceItem {
	var allArticles []digest.SourceItem
	seen := make(map[string]bool)
	for _, src := range s.sources {
		articles, err := src.Fetch(ctx)
		if err != nil {
			continue
		}
		for _, a := range articles {
			if a.URL == "" || seen[a.URL] {
				continue
			}
			seen[a.URL] = true
			allArticles = append(allArticles, a)
		}
	}
	return allArticles
}

func buildMetadata(item digest.DigestItem) json.RawMessage {
	m := map[string]string{
		"source_url":  item.URL,
		"source_name": item.SourceName,
	}
	b, _ := json.Marshal(m)
	return json.RawMessage(b)
}

func strPtr(s string) *string { return &s }
