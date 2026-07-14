package application

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

const categorizeSystemPrompt = `You are a categorization assistant.
For each article, assign 1-3 categories (short phrases).
Prefer reusing existing categories from the provided list when possible.
Only propose a new category when none of the existing ones fit.

Respond with ONLY a JSON object mapping article IDs to category arrays, like:
{"<article_uuid>": ["cat1", "cat2"], "<article_uuid>": ["cat1"]}

Do not include any text outside the JSON object.`

// Batch size for each LLM categorization call.
const categorizeBatchSize = 20

// CategorizeService processes a batch of uncategorized digest articles using a cheap LLM.
type CategorizeService struct {
	cheapLLM      ports.LLMClient
	categorizer   ports.ContentCategorizer
	digestQueries ports.ContentDigestReader
	userID        uuid.UUID
}

// NewCategorizeService creates a categorizer.
func NewCategorizeService(cheapLLM ports.LLMClient, categorizer ports.ContentCategorizer, digestQueries ports.ContentDigestReader, userID uuid.UUID) *CategorizeService {
	return &CategorizeService{cheapLLM: cheapLLM, categorizer: categorizer, digestQueries: digestQueries, userID: userID}
}

// Run categorizes all uncategorized digest articles for the user in batches.
func (s *CategorizeService) Run(ctx context.Context) error {
	articles, err := s.digestQueries.ListWithoutCategory(ctx, s.userID, categorizeBatchSize)
	if err != nil {
		return fmt.Errorf("list uncategorized: %w", err)
	}
	if len(articles) == 0 {
		return nil
	}

	// Fetch existing categories for vocabulary guidance
	existingCategories, err := s.categorizer.ListUserCategories(ctx, s.userID)
	if err != nil {
		slog.Warn("categorize: failed to list existing categories, proceeding without vocabulary", "error", err)
		existingCategories = nil
	}

	prompt := buildCategorizePrompt(articles, existingCategories)

	resp, err := s.cheapLLM.Complete(ctx, domain.LLMRequest{
		SystemPrompt: categorizeSystemPrompt,
		Messages:     []domain.LLMMessage{{Role: "user", Content: prompt}},
		MaxTokens:    1024,
		Temperature:  0.2,
	})
	if err != nil {
		return fmt.Errorf("LLM categorize: %w", err)
	}

	// Parse JSON response mapping article_id -> list of categories
	var categories map[string][]string
	if err := json.Unmarshal([]byte(resp.Content), &categories); err != nil {
		return fmt.Errorf("parse category response: %w", err)
	}

	// Update each article with its categories
	for _, article := range articles {
		cats, ok := categories[article.ID.String()]
		if !ok || len(cats) == 0 {
			continue
		}
		for _, cat := range cats {
			cat = strings.TrimSpace(cat)
			if cat == "" {
				continue
			}
			if err := s.categorizer.AddCategory(ctx, article.ID, cat); err != nil {
				slog.Warn("categorize: failed to add category", "article_id", article.ID, "category", cat, "error", err)
			}
		}
	}

	return nil
}

// buildCategorizePrompt formats the batch articles and existing vocabulary into a prompt.
func buildCategorizePrompt(articles []domain.GeneratedContent, existingCategories []string) string {
	var b strings.Builder
	if len(existingCategories) > 0 {
		b.WriteString("Existing categories (prefer these):\n")
		for _, cat := range existingCategories {
			fmt.Fprintf(&b, "- %s\n", cat)
		}
		b.WriteString("\n")
	}

	b.WriteString("Articles:\n")
	for _, article := range articles {
		title := "(no title)"
		if article.Title != nil {
			title = *article.Title
		}
		body := ""
		if article.BodyMarkdown != nil {
			body = *article.BodyMarkdown
		}
		fmt.Fprintf(&b, "- %s %s\n", article.ID.String(), title)
		if len(body) > 500 {
			body = body[:500] + "..."
		}
		if body != "" {
			fmt.Fprintf(&b, "  %s\n", body)
		}
	}

	return b.String()
}
