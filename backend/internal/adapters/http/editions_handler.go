package http

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/rodrigo-militao/forge/internal/core/application"
	coredomain "github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
	"github.com/rodrigo-militao/forge/internal/digest/domain"
)

// EditionHandler serves the /api/editions endpoints (ADR 0042).
type EditionHandler struct {
	editions domain.EditionRepository
	jobs     ports.JobRepository
	usages   ports.UsageCounterRepository
	plans    *application.Plans
}

func NewEditionHandler(editions domain.EditionRepository, jobs ports.JobRepository, usages ports.UsageCounterRepository, plans *application.Plans) *EditionHandler {
	return &EditionHandler{editions: editions, jobs: jobs, usages: usages, plans: plans}
}

// editionFromRequest fetches the edition by URL param {id} and checks ownership.
// On failure it writes an error response and returns nil.
func (h *EditionHandler) editionFromRequest(w http.ResponseWriter, r *http.Request) *domain.Edition {
	userID, _ := UserIDFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return nil
	}
	edition, err := h.editions.GetByID(r.Context(), id)
	if err != nil {
		writeNotFoundOrErr(w, err)
		return nil
	}
	if edition.UserID != userID {
		writeError(w, http.StatusForbidden, "forbidden")
		return nil
	}
	return edition
}

// GET /api/editions
func (h *EditionHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())

	status := r.URL.Query().Get("status")
	category := r.URL.Query().Get("category")
	tagID := r.URL.Query().Get("tag_id")

	var statusPtr, categoryPtr *string
	if status != "" {
		statusPtr = &status
	}
	if category != "" {
		categoryPtr = &category
	}

	var editions []domain.Edition
	var err error

	if tagID != "" {
		// tag filter: fetch all and filter in memory
		all, listErr := h.editions.ListByUserFiltered(r.Context(), userID, statusPtr, categoryPtr)
		if listErr != nil {
			slog.Error("editions: list failed", "error", listErr)
			writeError(w, http.StatusInternalServerError, "failed to list editions")
			return
		}
		for _, e := range all {
			for _, t := range e.Tags {
				if t == tagID {
					editions = append(editions, e)
					break
				}
			}
		}
	} else {
		editions, err = h.editions.ListByUserFiltered(r.Context(), userID, statusPtr, categoryPtr)
		if err != nil {
			slog.Error("editions: list failed", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to list editions")
			return
		}
	}

	if editions == nil {
		editions = []domain.Edition{}
	}
	result := make([]editionResponse, len(editions))
	for i, e := range editions {
		result[i] = editionToResponse(e)
	}
	writeJSON(w, http.StatusOK, result)
}

// POST /api/editions
func (h *EditionHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())

	var req struct {
		Title    string  `json:"title"`
		Category *string `json:"category"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	edition := &domain.Edition{
		UserID: userID,
		Title:  req.Title,
	}
	if req.Category != nil && *req.Category != "" {
		edition.Category = req.Category
	}

	if err := h.editions.Create(r.Context(), edition); err != nil {
		slog.Error("editions: create failed", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to create edition")
		return
	}
	writeJSON(w, http.StatusCreated, editionToResponse(*edition))
}

// GET /api/editions/{id}
func (h *EditionHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	edition := h.editionFromRequest(w, r)
	if edition == nil {
		return
	}
	writeJSON(w, http.StatusOK, editionToResponse(*edition))
}

// PUT /api/editions/{id}/body
func (h *EditionHandler) UpdateBody(w http.ResponseWriter, r *http.Request) {
	edition := h.editionFromRequest(w, r)
	if edition == nil {
		return
	}

	var req struct {
		Title string `json:"title"`
		Body  string `json:"body_html"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	if err := h.editions.UpdateBody(r.Context(), edition.ID, req.Title, req.Body); err != nil {
		slog.Error("editions: update body failed", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to update body")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// PUT /api/editions/{id}/status
func (h *EditionHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	edition := h.editionFromRequest(w, r)
	if edition == nil {
		return
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	s := domain.EditionStatus(req.Status)
	switch s {
	case domain.EditionDraft, domain.EditionPublished, domain.EditionDiscarded:
	default:
		writeError(w, http.StatusBadRequest, "invalid status")
		return
	}

	if err := h.editions.UpdateStatus(r.Context(), edition.ID, s); err != nil {
		slog.Error("editions: update status failed", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to update status")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// PUT /api/editions/{id}/category
func (h *EditionHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	edition := h.editionFromRequest(w, r)
	if edition == nil {
		return
	}

	var req struct {
		Category *string `json:"category"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	cat := req.Category
	if cat != nil && *cat == "" {
		cat = nil
	}
	if err := h.editions.UpdateCategory(r.Context(), edition.ID, cat); err != nil {
		slog.Error("editions: update category failed", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to update category")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// POST /api/editions/{id}/tags/{tag}
func (h *EditionHandler) AddTag(w http.ResponseWriter, r *http.Request) {
	edition := h.editionFromRequest(w, r)
	if edition == nil {
		return
	}
	tag := chi.URLParam(r, "tag")
	if tag == "" {
		writeError(w, http.StatusBadRequest, "tag required")
		return
	}

	if err := h.editions.AddTag(r.Context(), edition.ID, tag); err != nil {
		slog.Error("editions: add tag failed", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to add tag")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "tag added"})
}

// DELETE /api/editions/{id}/tags/{tag}
func (h *EditionHandler) RemoveTag(w http.ResponseWriter, r *http.Request) {
	edition := h.editionFromRequest(w, r)
	if edition == nil {
		return
	}
	tag := chi.URLParam(r, "tag")
	if tag == "" {
		writeError(w, http.StatusBadRequest, "tag required")
		return
	}

	if err := h.editions.RemoveTag(r.Context(), edition.ID, tag); err != nil {
		slog.Error("editions: remove tag failed", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to remove tag")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "tag removed"})
}

// POST /api/editions/{id}/generate-intro
func (h *EditionHandler) GenerateIntro(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	edition := h.editionFromRequest(w, r)
	if edition == nil {
		return
	}

	if err := h.plans.CheckMonthGenerationQuota(r.Context(), userID, h.usages); err != nil {
		writeErrorWithCode(w, http.StatusTooManyRequests, err)
		return
	}

	payload, _ := json.Marshal(map[string]string{"edition_id": edition.ID.String()})
	job := &coredomain.Job{
		UserID:  userID,
		Type:    "generate_edition_intro",
		Payload: payload,
	}
	if err := h.jobs.Create(r.Context(), job); err != nil {
		slog.Error("editions: enqueue intro failed", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to enqueue")
		return
	}

	if _, incErr := h.usages.Increment(r.Context(), userID, ""); incErr != nil {
		slog.Warn("usage counter increment failed", "error", incErr)
	}

	writeJSON(w, http.StatusAccepted, map[string]any{
		"job_id":  job.ID.String(),
		"status":  "enqueued",
	})
}

// POST /api/editions/{id}/articles
func (h *EditionHandler) AddArticle(w http.ResponseWriter, r *http.Request) {
	edition := h.editionFromRequest(w, r)
	if edition == nil {
		return
	}

	var req struct {
		ContentID string `json:"content_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ContentID == "" {
		writeError(w, http.StatusBadRequest, "content_id required")
		return
	}
	contentID, err := uuid.Parse(req.ContentID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid content_id")
		return
	}

	if err := h.editions.AddArticle(r.Context(), edition.ID, contentID); err != nil {
		slog.Error("editions: add article failed", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to add article")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "article added"})
}

// GET /api/editions/{id}/articles
func (h *EditionHandler) ListArticles(w http.ResponseWriter, r *http.Request) {
	edition := h.editionFromRequest(w, r)
	if edition == nil {
		return
	}

	articles, err := h.editions.ListArticles(r.Context(), edition.ID)
	if err != nil {
		slog.Error("editions: list articles failed", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to list articles")
		return
	}
	writeJSON(w, http.StatusOK, articles)
}

// DELETE /api/editions/{id}/articles/{contentID}
func (h *EditionHandler) RemoveArticle(w http.ResponseWriter, r *http.Request) {
	edition := h.editionFromRequest(w, r)
	if edition == nil {
		return
	}
	contentID, err := uuid.Parse(chi.URLParam(r, "contentID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid contentID")
		return
	}

	if err := h.editions.RemoveArticle(r.Context(), edition.ID, contentID); err != nil {
		slog.Error("editions: remove article failed", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to remove article")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "article removed"})
}

// writeNotFoundOrErr writes 404 if err is ErrNotFound, else 500.
func writeNotFoundOrErr(w http.ResponseWriter, err error) bool {
	if errors.Is(err, coredomain.ErrNotFound) {
		writeError(w, http.StatusNotFound, "not found")
		return true
	}
	writeError(w, http.StatusInternalServerError, "internal error")
	return false
}

// Response DTO
type editionResponse struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	Title       string    `json:"title"`
	BodyHTML    string    `json:"body_html"`
	Category    *string   `json:"category"`
	Status      string    `json:"status"`
	Tags        []string  `json:"tags"`
	CreatedAt   string    `json:"created_at"`
	UpdatedAt   string    `json:"updated_at"`
}

func editionToResponse(e domain.Edition) editionResponse {
	tags := e.Tags
	if tags == nil {
		tags = []string{}
	}
	return editionResponse{
		ID:        e.ID,
		UserID:    e.UserID,
		Title:     e.Title,
		BodyHTML:  e.Introduction,
		Category:  e.Category,
		Status:    string(e.Status),
		Tags:      tags,
		CreatedAt: e.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt: e.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}
}
