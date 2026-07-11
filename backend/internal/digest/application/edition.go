package application

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	coredomain "github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

// EditionService assembles newsletter editions from selected digest items.
type EditionService struct {
	content  ports.ContentRepository
	editions digest.EditionRepository
}

// NewEditionService creates an edition assembly service.
func NewEditionService(content ports.ContentRepository, editions digest.EditionRepository) *EditionService {
	return &EditionService{content: content, editions: editions}
}

// AssembleEditionResult contains the result of an edition assembly.
type AssembleEditionResult struct {
	EditionID string `json:"edition_id"`
	ItemCount int    `json:"item_count"`
}

// Assemble builds a newsletter edition from the selected digest items.
func (s *EditionService) Assemble(ctx context.Context, userID string, contentIDs ...string) (*AssembleEditionResult, error) {
	uid, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user id: %w", err)
	}

	slog.Info("edition assembly", "user_id", uid, "selected", len(contentIDs))

	allItems, err := s.content.ListByUser(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("listing content: %w", err)
	}

	// Collect all selected digest items (any status).
	var items []coredomain.GeneratedContent
	selected := make(map[uuid.UUID]bool, len(contentIDs))
	for _, idStr := range contentIDs {
		id, err := uuid.Parse(idStr)
		if err == nil {
			selected[id] = true
		}
	}
	for _, it := range allItems {
		if it.Product == coredomain.ProductDigest && selected[it.ID] {
			items = append(items, it)
		}
	}

	if len(items) == 0 {
		return nil, fmt.Errorf("no items found for the selected content")
	}

	editionItems := make([]digest.EditionItem, 0, len(items))
	body := "# Newsletter Edition\n\n"
	for i, item := range items {
		sourceURL := ""
		if len(item.Metadata) > 0 {
			var meta struct{ SourceURL string `json:"source_url"` }
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
		editionItems = append(editionItems, digest.EditionItem{
			ContentID:   item.ID,
			SortOrder:   i + 1,
			Title:       title,
			BodySummary: summary,
			SourceURL:   sourceURL,
		})
		body += fmt.Sprintf("## %s\n%s\n\n", title, summary)
	}

	// Counter for edition title
	existing, err := s.editions.ListByUser(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("listing editions: %w", err)
	}
	editionTitle := fmt.Sprintf("Newsletter Edition #%d", len(existing))

	edition := &digest.Edition{
		Title:        editionTitle,
		Introduction: "Draft edition",
		Status:       digest.EditionDraft,
		Items:        editionItems,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	edition.UserID = uid

	if err := s.editions.Create(ctx, edition); err != nil {
		return nil, fmt.Errorf("persisting edition: %w", err)
	}

	slog.Info("edition assembled", "edition_id", edition.ID, "title", editionTitle, "item_count", len(editionItems))

	if err := s.content.Create(ctx, &coredomain.GeneratedContent{
		UserID:       uid,
		Product:      coredomain.ProductNewsletter,
		Status:       coredomain.ContentDraft,
		SourceType:   strPtr("edition"),
		Title:        &edition.Title,
		BodyMarkdown: &body,
	}); err != nil {
		slog.Warn("failed to persist edition as content", "error", err)
	}

	return &AssembleEditionResult{
		EditionID: edition.ID.String(),
		ItemCount: len(editionItems),
	}, nil
}
