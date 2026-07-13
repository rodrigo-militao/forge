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
For each article, assign a single category (one word or short phrase).
Prefer reusing existing categories from the provided list when possible.
Only propose a new category when none of the existing ones fit.

Respond with ONLY a JSON object mapping article IDs to categories, like:
{"<article_uuid>": "category", "<article_uuid>": "..."}

Do not include any text outside the JSON object.`

// Batch size for each LLM categorization call.
const categorizeBatchSize = 20

// CategorizeService processes a batch of uncategorized digest articles using a cheap LLM.
type CategorizeService struct {
	cheapLLM      ports.LLMClient
	content       ports.ContentWriter
	digestQueries ports.ContentDigestReader
	userID        uuid.UUID
}

// NewCategorizeService creates a categorizer.
func NewCategorizeService(cheapLLM ports.LLMClient, content ports.ContentWriter, digestQueries ports.ContentDigestReader, userID uuid.UUID) *CategorizeService {
	return &CategorizeService{cheapLLM: cheapLLM, content: content, digestQueries: digestQueries, userID: userID}
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
	existingCategories, err := s.digestQueries.ListUserCategories(ctx, s.userID)
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

	// Parse JSON response mapping article_id -> category
	var categories map[string]string
	if err := json.Unmarshal([]byte(resp.Content), &categories); err != nil {
		return fmt.Errorf("parse category response: %w", err)
	}

	// Update each article
	for _, article := range articles {
		cat, ok := categories[article.ID.String()]
		if !ok || cat == "" {
			continue
		}
		cat = strings.TrimSpace(cat)
		if err := s.content.UpdateCategory(ctx, article.ID, &cat); err != nil {
			slog.Warn("categorize: failed to update", "article_id", article.ID, "error", err)
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

	b.WriteString("Categorize these articles:\n")
	for _, a := range articles {
		title := ""
		if a.Title != nil {
			title = *a.Title
		}
		body := ""
		if a.BodyMarkdown != nil {
			body = *a.BodyMarkdown
		}
		if len(body) > 500 {
			body = body[:500]
		}
		fmt.Fprintf(&b, "%s | %s | %s\n", a.ID.String(), title, body)
	}

	b.WriteString("\nRespond with JSON mapping each UUID to its category.")
	return b.String()
}
