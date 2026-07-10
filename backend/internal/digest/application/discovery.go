// Package application orchestrates Digest use cases.
package application

import (
	"context"
	"fmt"
	"log/slog"
	"regexp"
	"strings"
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
	content ports.ContentRepository
	userID  uuid.UUID
}

// NewDiscoveryService creates a discovery service.
func NewDiscoveryService(llm ports.LLMClient, sources []digest.ContentSource, content ports.ContentRepository, userID uuid.UUID) *DiscoveryService {
	return &DiscoveryService{
		llm:     llm,
		sources: sources,
		content: content,
		userID:  userID,
	}
}

// RunResult contains metrics for a discovery run.
type RunResult struct {
	TotalArticles int
	HighCount     int
	MediumCount   int
}

const discoverySystemPrompt = `You are a technical editorial curator.

Analyze each article and classify it as one of:
- HIGH: real case + concrete data or strong contrast + applicable technical lesson
- MEDIUM: solid technical content without specific case
- LOW: opinion without data, shallow news, generic content

For HIGH and MEDIUM articles, generate a 1-2 sentence summary in English.

Output format (one article per line):
ARTICLE_NUMBER | CLASSIFICATION | SUMMARY

IMPORTANT: Always include the article number as the first field. Match it to the "--- Article N ---" numbering in the input.`

// Run executes one discovery cycle.
func (s *DiscoveryService) Run(ctx context.Context, date time.Time) (*RunResult, error) {
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

	if len(allArticles) == 0 {
		return nil, fmt.Errorf("no articles found from any source")
	}

	prompt := buildPrompt(allArticles)
	resp, err := s.llm.Complete(ctx, ports.LLMRequest{
		SystemPrompt: discoverySystemPrompt,
		Messages:     []ports.LLMMessage{{Role: "user", Content: prompt}},
		MaxTokens:    4096,
		Temperature:  0.3,
	})
	if err != nil {
		return nil, fmt.Errorf("LLM classification: %w", err)
	}

	slog.Info("LLM classification response",
		"total_articles", len(allArticles),
		"response", resp.Content,
	)

	high, medium := parseResponse(resp.Content, allArticles)

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
	for _, item := range high {
		slog.Info("persisting digest item",
			"title", item.Title,
			"summary_len", len(item.Summary),
			"score", item.Score,
		)
		summary := item.Summary
		if err := s.content.Create(ctx, &domain.GeneratedContent{
			UserID:       s.userID,
			Product:      domain.ProductDigest,
			Status:       domain.ContentDraft,
			SourceType:   strPtr("discovery"),
			Title:        &item.Title,
			BodyMarkdown: &summary,
		}); err != nil {
			return nil, fmt.Errorf("persisting digest item: %w", err)
		}
	}
	for _, item := range medium {
		summary := item.Summary
		if err := s.content.Create(ctx, &domain.GeneratedContent{
			UserID:       s.userID,
			Product:      domain.ProductDigest,
			Status:       domain.ContentDraft,
			SourceType:   strPtr("discovery"),
			Title:        &item.Title,
			BodyMarkdown: &summary,
		}); err != nil {
			return nil, fmt.Errorf("persisting digest item: %w", err)
		}
	}

	return &RunResult{
		TotalArticles: len(allArticles),
		HighCount:     len(high),
		MediumCount:   len(medium),
	}, nil
}

// --- helpers ---

func buildPrompt(articles []digest.SourceItem) string {
	var b strings.Builder
	b.WriteString("Analyze the following articles and classify each one:\n\n")
	for i, a := range articles {
		fmt.Fprintf(&b, "--- Article %d ---\n", i+1)
		fmt.Fprintf(&b, "Title: %s\n", a.Title)
		fmt.Fprintf(&b, "Source: %s\n", a.SourceName)
		fmt.Fprintf(&b, "URL: %s\n", a.URL)
		fmt.Fprintf(&b, "Content: %s\n", truncate(a.Content, 2000))
		b.WriteString("\n")
	}
	return b.String()
}

func parseResponse(response string, articles []digest.SourceItem) (high, medium []digest.DigestItem) {
	// Strip markdown code blocks — LLMs often wrap output in ```.
	response = stripCodeFences(response)

	linePattern := regexp.MustCompile(`^\s*(\d+)\s*[|\-,:]\s*(HIGH|MEDIUM|LOW)\s*[|\-,:]\s*(.+)$`)
	for _, line := range strings.Split(response, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		m := linePattern.FindStringSubmatch(line)
		if m == nil {
			continue
		}
		articleNum := atoi(m[1])
		classification := m[2]
		summary := strings.TrimSpace(m[3])

		if classification == "LOW" {
			continue
		}

		item := digest.DigestItem{
			Summary: summary,
			Score:   4,
			Status:  digest.ItemPending,
		}
		idx := articleNum - 1
		if idx >= 0 && idx < len(articles) {
			a := articles[idx]
			item.Title = a.Title
			item.URL = a.URL
			item.SourceName = a.SourceName
		} else {
			// Fallback: use first ~80 chars of summary as title
			item.Title = truncate(summary, 80)
		}

		switch classification {
		case "HIGH":
			item.Score = 5
			high = append(high, item)
		case "MEDIUM":
			medium = append(medium, item)
		}
	}
	return high, medium
}

// stripCodeFences removes markdown ``` ... ``` or ` ... ` around content.
func stripCodeFences(s string) string {
	s = strings.TrimSpace(s)
	// Remove leading ``` (possibly with language tag)
	s = regexp.MustCompile("(?s)^```[a-zA-Z0-9]*\n?").ReplaceAllString(s, "")
	// Remove trailing ```
	s = regexp.MustCompile("(?s)\n?```$").ReplaceAllString(s, "")
	// Remove inline backticks if that's all that's wrapping
	s = strings.TrimPrefix(s, "`")
	s = strings.TrimSuffix(s, "`")
	return strings.TrimSpace(s)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

func atoi(s string) int {
	n := 0
	for _, c := range s {
		if c >= '0' && c <= '9' {
			n = n*10 + int(c-'0')
		}
	}
	return n
}

func strPtr(s string) *string { return &s }
