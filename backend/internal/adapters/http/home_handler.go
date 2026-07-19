package http

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/rodrigo-militao/forge/internal/core/domain"
	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

// Local interfaces so tests can mock just what's needed.
type (
	homeContentLister interface {
		ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.GeneratedContent, error)
	}
	homeEditionLister interface {
		ListByUser(ctx context.Context, userID uuid.UUID) ([]digest.Edition, error)
	}
	homeIdeaRepo interface {
		ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.Idea, error)
	}
)

// HomeHandler serves the /api/home/insights endpoint.
// Insights are derived from existing data — no LLM call, no new tables.
type HomeHandler struct {
	content  homeContentLister
	editions homeEditionLister
	ideas    homeIdeaRepo
}

func NewHomeHandler(content homeContentLister, editions homeEditionLister, ideas homeIdeaRepo) *HomeHandler {
	return &HomeHandler{content: content, editions: editions, ideas: ideas}
}

type Insight struct {
	ID          string `json:"id"`
	Text        string `json:"text"`
	ActionLabel string `json:"action_label"`
	To          string `json:"to"`
	Icon        string `json:"icon"`
}

func (h *HomeHandler) Insights(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	insights := []Insight{}

	// Ideas worth developing
	ideas, err := h.ideas.ListByUser(r.Context(), userID)
	if err == nil {
		openCount := 0
		for _, idea := range ideas {
			if idea.Status == "open" {
				openCount++
			}
		}
		if openCount > 0 {
			insights = append(insights, Insight{
				ID:   "ideas-worth-developing",
				To:   "/content/ideas",
				Icon: "lightbulb",
			})
		}
	}

	// Drafts that could use more references
	content, err := h.content.ListByUser(r.Context(), userID)
	if err == nil {
		draftsWithBody := 0
		for _, c := range content {
			if (c.Status == "building" || c.Status == "draft") && c.BodyMarkdown != nil && len(*c.BodyMarkdown) > 50 {
				draftsWithBody++
			}
		}
		if draftsWithBody > 0 {
			insights = append(insights, Insight{
				ID:   "drafts-need-references",
				To:   "/content/articles",
				Icon: "fileText",
			})
		}
	}

	// Newsletter overdue (>7 days since last published)
	editions, err := h.editions.ListByUser(r.Context(), userID)
	if err == nil {
		var lastPublished *digest.Edition
		for i := range editions {
			if editions[i].Status == "published" {
				if lastPublished == nil || editions[i].UpdatedAt.After(lastPublished.UpdatedAt) {
					lastPublished = &editions[i]
				}
			}
		}
		if lastPublished != nil {
			daysSince := int(time.Since(lastPublished.UpdatedAt).Hours() / 24)
			if daysSince >= 7 {
				insights = append(insights, Insight{
					ID:   "newsletter-overdue",
					To:   "/content/newsletters/" + lastPublished.ID.String() + "/edit",
					Icon: "mail",
				})
			}
		}
	}

	writeJSON(w, http.StatusOK, insights)
}
