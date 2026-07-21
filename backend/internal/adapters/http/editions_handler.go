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
	digestapp "github.com/rodrigo-militao/forge/internal/digest/application"
	"github.com/rodrigo-militao/forge/internal/digest/domain"
)

// isPlanLimit checks whether err is a plan limit error.
func isPlanLimit(err error) bool {
	var lim *application.LimitError
	return errors.As(err, &lim)
}

// EditionHandler serves the /api/editions endpoints (ADR 0042, ADR 0046).
type EditionHandler struct {
	svc *digestapp.EditionService
}

func NewEditionHandler(svc *digestapp.EditionService) *EditionHandler {
	return &EditionHandler{svc: svc}
}

// editionFromRequest parses {id} and fetches via the service (which checks ownership).
func (h *EditionHandler) editionFromRequest(w http.ResponseWriter, r *http.Request) (*domain.Edition, bool) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return nil, false
	}
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return nil, false
	}
	edition, err := h.svc.GetByID(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, coredomain.ErrNotOwned) {
			writeError(w, http.StatusForbidden, "forbidden")
		} else if errors.Is(err, coredomain.ErrNotFound) {
			writeError(w, http.StatusNotFound, "not found")
		} else {
			slog.Error("edition fetch failed", "error", err)
			writeError(w, http.StatusInternalServerError, "internal error")
		}
		return nil, false
	}
	return edition, true
}

// writeEditionErr checks domain errors for edition operations
// and writes the appropriate HTTP response. Returns true if the error
// was handled (caller should stop processing).
func writeEditionErr(w http.ResponseWriter, err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, coredomain.ErrNotOwned) {
		writeError(w, http.StatusForbidden, "forbidden")
	} else if errors.Is(err, coredomain.ErrNotFound) {
		writeError(w, http.StatusNotFound, "not found")
	} else if errors.Is(err, coredomain.ErrInvalidInput) {
		writeError(w, http.StatusBadRequest, err.Error())
	} else {
		slog.Error("edition operation failed", "error", err)
	writeError(w, http.StatusInternalServerError, "operation failed")
	}
	return true
}

// GET /api/editions
func (h *EditionHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())

	status := r.URL.Query().Get("status")
	category := r.URL.Query().Get("category")
	tagID := r.URL.Query().Get("tag_id")

	var statusPtr, categoryPtr, tagPtr *string
	if status != "" {
		statusPtr = &status
	}
	if category != "" {
		categoryPtr = &category
	}
	if tagID != "" {
		tagPtr = &tagID
	}

	editions, err := h.svc.List(r.Context(), userID, statusPtr, categoryPtr, tagPtr)
	if err != nil {
	writeEditionErr(w, err)
		return
	}
	if editions == nil {
		editions = []domain.Edition{}
	}

	ids := make([]uuid.UUID, len(editions))
	for i, e := range editions {
		ids[i] = e.ID
	}
	counts, _ := h.svc.ListArticleCounts(r.Context(), ids)

	result := make([]editionResponse, len(editions))
	for i, e := range editions {
		result[i] = editionToResponse(e, counts[e.ID])
	}
	writeJSON(w, http.StatusOK, result)
}

// POST /api/editions
func (h *EditionHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())

	var req struct {
		Title       string  `json:"title"`
		Category    *string `json:"category"`
		Destination *string `json:"destination"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	edition, err := h.svc.Create(r.Context(), userID, req.Title, req.Category, req.Destination)
	if err != nil {
	writeEditionErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, editionToResponse(*edition, 0))
}

// GET /api/editions/{id}
func (h *EditionHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	edition, ok := h.editionFromRequest(w, r)
	if !ok {
		return
	}
	counts, _ := h.svc.ListArticleCounts(r.Context(), []uuid.UUID{edition.ID})
	writeJSON(w, http.StatusOK, editionToResponse(*edition, counts[edition.ID]))
}

// PUT /api/editions/{id}/body
func (h *EditionHandler) UpdateBody(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
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

	if err := h.svc.UpdateBody(r.Context(), id, userID, req.Title, req.Body); err != nil {
		writeEditionErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// PUT /api/editions/{id}/status
func (h *EditionHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	if err := h.svc.UpdateStatus(r.Context(), id, userID, domain.EditionStatus(req.Status)); err != nil {
		if errors.Is(err, coredomain.ErrInvalidInput) {
			writeError(w, http.StatusBadRequest, err.Error())
		} else {
			slog.Error("editions: update status failed", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to update status")
		}
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// PUT /api/editions/{id}/category
func (h *EditionHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
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
	if err := h.svc.UpdateCategory(r.Context(), id, userID, cat); err != nil {
	writeEditionErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// POST /api/editions/{id}/tags/{tag}
func (h *EditionHandler) AddTag(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	tag := chi.URLParam(r, "tag")
	if tag == "" {
		writeError(w, http.StatusBadRequest, "tag required")
		return
	}
	if err := h.svc.AddTag(r.Context(), id, userID, tag); err != nil {
	writeEditionErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "tag added"})
}

// DELETE /api/editions/{id}/tags/{tag}
func (h *EditionHandler) RemoveTag(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	tag := chi.URLParam(r, "tag")
	if tag == "" {
		writeError(w, http.StatusBadRequest, "tag required")
		return
	}
	if err := h.svc.RemoveTag(r.Context(), id, userID, tag); err != nil {
	writeEditionErr(w, err)
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
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	job, err := h.svc.GenerateIntro(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, coredomain.ErrNotOwned) {
			writeError(w, http.StatusForbidden, "forbidden")
		} else if errors.Is(err, coredomain.ErrNotFound) {
			writeError(w, http.StatusNotFound, "not found")
		} else if isPlanLimit(err) {
			writeErrorWithCode(w, http.StatusTooManyRequests, err)
		} else {
			slog.Error("editions: generate intro failed", "error", err)
			writeError(w, http.StatusInternalServerError, "operation failed")
		}
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]any{
		"job_id": job.ID.String(),
		"status": "enqueued",
	})
}

// POST /api/editions/{id}/articles
func (h *EditionHandler) AddArticle(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
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

	if err := h.svc.AddArticle(r.Context(), id, userID, contentID); err != nil {
	writeEditionErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "article added"})
}

// GET /api/editions/{id}/articles
func (h *EditionHandler) ListArticles(w http.ResponseWriter, r *http.Request) {
	edition, ok := h.editionFromRequest(w, r)
	if !ok {
		return
	}
	articles, err := h.svc.ListArticles(r.Context(), edition.ID, edition.UserID)
	if err != nil {
	writeEditionErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, articles)
}

// DELETE /api/editions/{id}/articles/{contentID}
func (h *EditionHandler) RemoveArticle(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	contentID, err := uuid.Parse(chi.URLParam(r, "contentID"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid contentID")
		return
	}
	if err := h.svc.RemoveArticle(r.Context(), id, userID, contentID); err != nil {
	writeEditionErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "article removed"})
}

// POST /api/editions/{id}/duplicate
func (h *EditionHandler) Duplicate(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}
	dup, err := h.svc.Duplicate(r.Context(), id, userID)
	if err != nil {
	writeEditionErr(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, editionToResponse(*dup, 0))
}

// PUT /api/editions/{id}/destination
func (h *EditionHandler) UpdateDestination(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var req struct {
		Destination *string `json:"destination"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	dest := req.Destination
	if dest != nil && *dest == "" {
		dest = nil
	}
	if err := h.svc.UpdateDestination(r.Context(), id, userID, dest); err != nil {
	writeEditionErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// GET /api/editions/destinations
func (h *EditionHandler) ListDestinations(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())
	dests, err := h.svc.ListDestinations(r.Context(), userID)
	if err != nil {
	writeEditionErr(w, err)
		return
	}
	if dests == nil {
		dests = []string{}
	}
	writeJSON(w, http.StatusOK, dests)
}

// Response DTO
type editionResponse struct {
	ID           uuid.UUID `json:"id"`
	UserID       uuid.UUID `json:"user_id"`
	Title        string    `json:"title"`
	BodyHTML     string    `json:"body_html"`
	Category     *string   `json:"category"`
	Status       string    `json:"status"`
	Destination  *string   `json:"destination"`
	Tags         []string  `json:"tags"`
	ArticleCount int       `json:"article_count"`
	CreatedAt    string    `json:"created_at"`
	UpdatedAt    string    `json:"updated_at"`
}

func editionToResponse(e domain.Edition, articleCount int) editionResponse {
	tags := e.Tags
	if tags == nil {
		tags = []string{}
	}
	return editionResponse{
		ID:           e.ID,
		UserID:       e.UserID,
		Title:        e.Title,
		BodyHTML:     e.Introduction,
		Category:     e.Category,
		Status:       string(e.Status),
		Destination:  e.Destination,
		Tags:         tags,
		ArticleCount: articleCount,
		CreatedAt:    e.CreatedAt.Format("2006-01-02T15:04:05Z"),
		UpdatedAt:    e.UpdatedAt.Format("2006-01-02T15:04:05Z"),
	}
}
