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

	"github.com/rodrigo-militao/forge/internal/adapters/postgres"
	"github.com/rodrigo-militao/forge/internal/core/application"
	"github.com/rodrigo-militao/forge/internal/core/domain"
)

type ContentHandler struct {
	svc    *application.ContentService
	source *postgres.SourceTracking
}

func NewContentHandler(svc *application.ContentService, source *postgres.SourceTracking) *ContentHandler {
	return &ContentHandler{svc: svc, source: source}
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


func (h *ContentHandler) saveOrDelete(w http.ResponseWriter, r *http.Request) (*domain.GeneratedContent, bool) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid content id")
		return nil, false
	}
	userID, _ := UserIDFromContext(r.Context())
	c, err := h.svc.GetOwnedContent(r.Context(), id, userID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			writeError(w, http.StatusNotFound, "content not found")
		} else {
			writeError(w, http.StatusForbidden, "not your content")
		}
		return nil, false
	}
	return c, true
}

func (h *ContentHandler) Save(w http.ResponseWriter, r *http.Request) {
	c, ok := h.saveOrDelete(w, r)
	if !ok {
		return
	}
	var req struct {
		Title        *string `json:"title"`
		BodyMarkdown *string `json:"body_markdown"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if err := h.svc.UpdateBody(r.Context(), c.ID, req.Title, req.BodyMarkdown); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "saved"})
}

func (h *ContentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	c, ok := h.saveOrDelete(w, r)
	if !ok {
		return
	}
	if err := h.svc.SoftDelete(r.Context(), c.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *ContentHandler) UpdateCategories(w http.ResponseWriter, r *http.Request) {
	c, ok := h.saveOrDelete(w, r)
	if !ok {
		return
	}
	var req struct {
		Categories []string `json:"categories"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if err := h.svc.SetCategories(r.Context(), c.ID, req.Categories); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update categories")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *ContentHandler) AddCategory(w http.ResponseWriter, r *http.Request) {
	c, ok := h.saveOrDelete(w, r)
	if !ok {
		return
	}
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
	if err := h.svc.AddCategory(r.Context(), c.ID, req.Category); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to add category")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "category added"})
}

func (h *ContentHandler) RemoveCategory(w http.ResponseWriter, r *http.Request) {
	c, ok := h.saveOrDelete(w, r)
	if !ok {
		return
	}
	catParam := chi.URLParam(r, "category")
	cat, err := url.QueryUnescape(catParam)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid category")
		return
	}
	if err := h.svc.RemoveCategory(r.Context(), c.ID, cat); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to remove category")
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
	c, ok := h.saveOrDelete(w, r)
	if !ok {
		return
	}
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
	if err := h.svc.AddTag(r.Context(), c.ID, req.Tag); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to add tag")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "tag added"})
}

func (h *ContentHandler) RemoveTag(w http.ResponseWriter, r *http.Request) {
	c, ok := h.saveOrDelete(w, r)
	if !ok {
		return
	}
	tagParam := chi.URLParam(r, "tag")
	tag, err := url.QueryUnescape(tagParam)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid tag")
		return
	}
	if err := h.svc.RemoveTag(r.Context(), c.ID, tag); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to remove tag")
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
	c, ok := h.saveOrDelete(w, r)
	if !ok {
		return
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	status := domain.ContentStatus(req.Status)
	switch status {
	case domain.ContentDraft, domain.ContentPublished, domain.ContentDiscarded:
	default:
		writeError(w, http.StatusBadRequest, "invalid status: must be draft, published, or discarded")
		return
	}
	if err := h.svc.UpdateStatus(r.Context(), c.ID, status); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update status")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *ContentHandler) UpdateOutline(w http.ResponseWriter, r *http.Request) {
	c, ok := h.saveOrDelete(w, r)
	if !ok {
		return
	}
	var req struct {
		Outline *string `json:"outline"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if err := h.svc.UpdateOutline(r.Context(), c.ID, req.Outline); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update outline")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *ContentHandler) LinkSource(w http.ResponseWriter, r *http.Request) {
	c, ok := h.saveOrDelete(w, r)
	if !ok {
		return
	}
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
	if err := h.svc.LinkSource(r.Context(), c.ID, sourceID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to link source")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "linked"})
}
