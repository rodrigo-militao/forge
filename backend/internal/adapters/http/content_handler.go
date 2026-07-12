package http

import (
	"encoding/json"
	"net/http"
	"net/url"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

type ContentHandler struct {
	content ports.ContentRepository
}

func NewContentHandler(content ports.ContentRepository) *ContentHandler {
	return &ContentHandler{content: content}
}

func (h *ContentHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())
	items, err := h.content.ListByUser(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list content")
		return
	}
	writeJSON(w, http.StatusOK, items)
}

// getOwnedContent parses the content ID from the URL, fetches it,
// and verifies the requesting user owns it. On any failure it writes
// the error response and returns false.
func (h *ContentHandler) getOwnedContent(w http.ResponseWriter, r *http.Request) (*domain.GeneratedContent, bool) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid content id")
		return nil, false
	}
	content, err := h.content.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "content not found")
		return nil, false
	}
	userID, _ := UserIDFromContext(r.Context())
	if content.UserID != userID {
		writeError(w, http.StatusForbidden, "not your content")
		return nil, false
	}
	return content, true
}

func (h *ContentHandler) Save(w http.ResponseWriter, r *http.Request) {
	c, ok := h.getOwnedContent(w, r)
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

	if err := h.content.UpdateBody(r.Context(), c.ID, req.Title, req.BodyMarkdown); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "saved"})
}

func (h *ContentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	c, ok := h.getOwnedContent(w, r)
	if !ok {
		return
	}
	if err := h.content.SoftDelete(r.Context(), c.ID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (h *ContentHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	c, ok := h.getOwnedContent(w, r)
	if !ok {
		return
	}
	var req struct {
		Category *string `json:"category"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	// Treat empty string as null (clear category)
	if req.Category != nil && strings.TrimSpace(*req.Category) == "" {
		req.Category = nil
	}
	if err := h.content.UpdateCategory(r.Context(), c.ID, req.Category); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update category")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *ContentHandler) AddTag(w http.ResponseWriter, r *http.Request) {
	c, ok := h.getOwnedContent(w, r)
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
	if err := h.content.AddTag(r.Context(), c.ID, req.Tag); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to add tag")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "tag added"})
}

func (h *ContentHandler) RemoveTag(w http.ResponseWriter, r *http.Request) {
	c, ok := h.getOwnedContent(w, r)
	if !ok {
		return
	}
	tagParam := chi.URLParam(r, "tag")
	tag, err := url.QueryUnescape(tagParam)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid tag")
		return
	}
	if err := h.content.RemoveTag(r.Context(), c.ID, tag); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to remove tag")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "tag removed"})
}

func (h *ContentHandler) ListTags(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())
	tags, err := h.content.ListUserTags(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list tags")
		return
	}
	if tags == nil {
		tags = []string{}
	}
	writeJSON(w, http.StatusOK, tags)
}
