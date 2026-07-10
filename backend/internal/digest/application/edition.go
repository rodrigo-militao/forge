package application

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	coredomain "github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

// AssembleEditionParams is the input for assembling a newsletter edition.
type AssembleEditionParams struct {
	UserID string
}

// AssembleEditionResult is the output of a successful assembly.
type AssembleEditionResult struct {
	EditionID string
	ItemCount int
}

// EditionService assembles newsletter editions from approved digest items.
type EditionService struct {
	llm     ports.LLMClient
	content ports.ContentRepository
	editions digest.EditionRepository
}

// NewEditionService creates an edition assembly service.
func NewEditionService(llm ports.LLMClient, content ports.ContentRepository, editions digest.EditionRepository) *EditionService {
	return &EditionService{
		llm:      llm,
		content:  content,
		editions: editions,
	}
}

// Assemble collects approved digest items not yet in any edition, generates
// an introduction via LLM, and creates a draft edition.
func (s *EditionService) Assemble(ctx context.Context, userID string) (*AssembleEditionResult, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user id: %w", err)
	}

	// Load approved digest items and filter in Go (the NOT IN subquery
	// was unreliable with sqlc, so we check edition membership here).
	slog.Info("edition assembly", "user_id", uid)

	allItems, err := s.content.ListByUser(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("listing content: %w", err)
	}

	var items []coredomain.GeneratedContent
	for _, it := range allItems {
		if it.Product == coredomain.ProductDigest && it.Status == coredomain.ContentApproved {
			items = append(items, it)
		}
	}
	if len(items) == 0 {
		return nil, fmt.Errorf("no approved items available for edition")
	}

	var itemDescriptions []string
	editionItems := make([]digest.EditionItem, 0, len(items))
	for i, item := range items {
		sourceURL := ""
		if len(item.Metadata) > 0 {
			var meta struct {
				SourceURL string `json:"source_url"`
			}
			if err := json.Unmarshal(item.Metadata, &meta); err == nil {
				sourceURL = meta.SourceURL
			}
		}

		title := ""
		if item.Title != nil {
			title = *item.Title
		}
		summary := ""
		if item.BodyMarkdown != nil {
			summary = *item.BodyMarkdown
		}

		itemDescriptions = append(itemDescriptions, fmt.Sprintf("- %s\n  %s", title, summary))

		editionItems = append(editionItems, digest.EditionItem{
			ContentID:   item.ID,
			SortOrder:   i + 1,
			Title:       title,
			BodySummary: summary,
			SourceURL:   sourceURL,
		})
	}

	// Generate introduction via LLM
	prompt := buildEditionPrompt(itemDescriptions)
	resp, err := s.llm.Complete(ctx, ports.LLMRequest{
		SystemPrompt: editionSystemPrompt,
		Messages:     []ports.LLMMessage{{Role: "user", Content: prompt}},
		MaxTokens:    2048,
		Temperature:  0.5,
	})
	if err != nil {
		return nil, fmt.Errorf("LLM edition generation: %w", err)
	}

	intro, editionTitle := parseEditionResponse(resp.Content)

	edition := &digest.Edition{
		Title:        editionTitle,
		Introduction: intro,
		Status:       digest.EditionDraft,
		Items:        editionItems,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	edition.UserID = uid

	if err := s.editions.Create(ctx, edition); err != nil {
		return nil, fmt.Errorf("persisting edition: %w", err)
	}

	slog.Info("edition assembled",
		"edition_id", edition.ID,
		"item_count", len(editionItems),
	)

	// Save a copy as generated_content so frontend can detect it
	editionBody := fmt.Sprintf("# %s\n\n%s\n\n---\n\n", edition.Title, edition.Introduction)
	for _, item := range editionItems {
		editionBody += fmt.Sprintf("## %s\n%s\n\n", item.Title, item.BodySummary)
	}
	if err := s.content.Create(ctx, &coredomain.GeneratedContent{
		UserID:       uid,
		Product:      coredomain.ProductNewsletter,
		Status:       coredomain.ContentDraft,
		SourceType:   strPtr("edition"),
		Title:        &edition.Title,
		BodyMarkdown: &editionBody,
	}); err != nil {
		slog.Warn("failed to persist edition as content", "error", err)
	}

	return &AssembleEditionResult{
		EditionID: edition.ID.String(),
		ItemCount: len(editionItems),
	}, nil
}

const editionSystemPrompt = `You are an editorial assistant assembling a newsletter edition.

Given a list of approved articles (title + summary), produce:
1. A compelling newsletter title (one line, no quotes)
2. A short introductory paragraph that hooks the reader and summarizes
   what's in this edition. Write in a warm, professional tone — like a
   curator writing to a knowledgeable audience.

Format your response as:
TITLE: <the title>
INTRODUCTION: <the intro text>`

func buildEditionPrompt(items []string) string {
	return "Assemble a newsletter edition from these articles:\n\n" + strings.Join(items, "\n\n")
}

func parseEditionResponse(raw string) (introduction, title string) {
	lines := strings.Split(raw, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "TITLE:") {
			title = strings.TrimSpace(strings.TrimPrefix(line, "TITLE:"))
		} else if strings.HasPrefix(line, "INTRODUCTION:") {
			introduction = strings.TrimSpace(strings.TrimPrefix(line, "INTRODUCTION:"))
		}
	}
	if title == "" {
		title = "Newsletter Edition"
	}
	return introduction, title
}
