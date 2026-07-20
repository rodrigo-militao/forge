package http

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/rodrigo-militao/forge/internal/core/application"
	"github.com/rodrigo-militao/forge/internal/core/domain"
)

// contentOpError maps ContentService errors to HTTP status codes.
//   - domain.ErrNotFound → 404
//   - domain.ErrNotOwned → 403
//   - other errors → 500 (logged)
func contentOpError(w http.ResponseWriter, err error) bool {
	if err == nil {
		return true
	}
	if errors.Is(err, domain.ErrNotFound) {
		writeError(w, http.StatusNotFound, "content not found")
	} else if errors.Is(err, domain.ErrNotOwned) {
		writeError(w, http.StatusForbidden, "not your content")
	} else if errors.Is(err, domain.ErrInvalidInput) {
		writeError(w, http.StatusBadRequest, err.Error())
	} else {
		slog.Error("content operation failed", "error", err)
		writeError(w, http.StatusInternalServerError, "operation failed")
	}
	return false
}

type ContentHandler struct {
	svc    *application.ContentService
	source application.SourceLinker
}

func NewContentHandler(svc *application.ContentService, source application.SourceLinker) *ContentHandler {
	return &ContentHandler{svc: svc, source: source}
}

// Create creates a new blank Article in BUILDING status.
func (h *ContentHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())
	article, err := h.svc.CreateBlankArticle(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create article")
		return
	}
	writeJSON(w, http.StatusCreated, article)
}

// GetByID returns a single content item by ID, enforcing ownership.
func (h *ContentHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid content id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())
	content, err := h.svc.GetOwnedContent(r.Context(), id, userID)
	if err != nil {
		contentOpError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, content)
}

func (h *ContentHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())
	items, err := h.svc.ListByUser(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list content")
		return
	}
	writeJSON(w, http.StatusOK, items)
}

func (h *ContentHandler) Save(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid content id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())
	var req struct {
		Title        *string `json:"title"`
		BodyMarkdown *string `json:"body_markdown"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if !contentOpError(w, h.svc.UpdateBody(r.Context(), id, userID, req.Title, req.BodyMarkdown)) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "saved"})
}

func (h *ContentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid content id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())
	if !contentOpError(w, h.svc.SoftDelete(r.Context(), id, userID)) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *ContentHandler) UpdateCategories(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid content id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())
	var req struct {
		Categories []string `json:"categories"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if !contentOpError(w, h.svc.SetCategories(r.Context(), id, userID, req.Categories)) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *ContentHandler) AddCategory(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid content id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())
	var req struct {
		Category string `json:"category"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	req.Category = strings.TrimSpace(req.Category)
	if req.Category == "" {
		writeError(w, http.StatusBadRequest, "category cannot be empty")
		return
	}
	if !contentOpError(w, h.svc.AddCategory(r.Context(), id, userID, req.Category)) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "category added"})
}

func (h *ContentHandler) RemoveCategory(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid content id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())
	catParam := chi.URLParam(r, "category")
	cat, err := url.QueryUnescape(catParam)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid category")
		return
	}
	if !contentOpError(w, h.svc.RemoveCategory(r.Context(), id, userID, cat)) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "category removed"})
}

func (h *ContentHandler) ListCategories(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())
	categories, err := h.svc.ListCategories(r.Context(), userID)
	if err != nil {
		slog.Error("categories: list failed", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to list categories")
		return
	}
	if categories == nil {
		categories = []string{}
	}
	writeJSON(w, http.StatusOK, categories)
}

func (h *ContentHandler) AddTag(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid content id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())
	var req struct {
		Tag string `json:"tag"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	req.Tag = strings.TrimSpace(req.Tag)
	if req.Tag == "" {
		writeError(w, http.StatusBadRequest, "tag cannot be empty")
		return
	}
	if !contentOpError(w, h.svc.AddTag(r.Context(), id, userID, req.Tag)) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "tag added"})
}

func (h *ContentHandler) RemoveTag(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid content id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())
	tagParam := chi.URLParam(r, "tag")
	tag, err := url.QueryUnescape(tagParam)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid tag")
		return
	}
	if !contentOpError(w, h.svc.RemoveTag(r.Context(), id, userID, tag)) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "tag removed"})
}

func (h *ContentHandler) ListTags(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())
	tags, err := h.svc.ListTags(r.Context(), userID)
	if err != nil {
		slog.Error("tags: list failed", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to list tags")
		return
	}
	if tags == nil {
		tags = []string{}
	}
	writeJSON(w, http.StatusOK, tags)
}

func (h *ContentHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid content id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())
	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	status := domain.ContentStatus(req.Status)
	if !contentOpError(w, h.svc.TransitionStatus(r.Context(), id, userID, status)) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// Transition transitions content through the Sprint 1 lifecycle.
// The body specifies the target status:
//
//	{"to": "review"}
//
// Only valid lifecycle transitions are accepted:
//
//	building → review
//	review   → building | ready
//	ready    → building | published
//	published → building (deliberate reopen)
func (h *ContentHandler) Transition(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid content id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())
	var req struct {
		To string `json:"to"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	target := domain.ContentStatus(req.To)
	if !contentOpError(w, h.svc.TransitionStatus(r.Context(), id, userID, target)) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "transitioned"})
}

func (h *ContentHandler) UpdateOutline(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid content id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())
	var req struct {
		Outline *string `json:"outline"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if !contentOpError(w, h.svc.UpdateOutline(r.Context(), id, userID, req.Outline)) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *ContentHandler) LinkSource(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid content id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())
	var req struct {
		SourceID string `json:"source_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	sourceID, err := uuid.Parse(req.SourceID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid source_id")
		return
	}
	if !contentOpError(w, h.svc.LinkSource(r.Context(), id, sourceID, userID)) {
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "linked"})
}
