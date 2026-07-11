package http

import (
	"encoding/json"
	"net/http"

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

func (h *ContentHandler) Approve(w http.ResponseWriter, r *http.Request) {
	h.updateStatus(w, r, domain.ContentApproved)
}

func (h *ContentHandler) Reject(w http.ResponseWriter, r *http.Request) {
	h.updateStatus(w, r, domain.ContentRejected)
}

func (h *ContentHandler) updateStatus(w http.ResponseWriter, r *http.Request, status domain.ContentStatus) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid content id")
		return
	}
	content, err := h.content.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "content not found")
		return
	}
	userID, _ := UserIDFromContext(r.Context())
	if content.UserID != userID {
		writeError(w, http.StatusForbidden, "not your content")
		return
	}
	if err := h.content.UpdateStatus(r.Context(), id, status); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update status")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": string(status)})
}

func (h *ContentHandler) Save(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid content id")
		return
	}
	content, err := h.content.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "content not found")
		return
	}
	userID, _ := UserIDFromContext(r.Context())
	if content.UserID != userID {
		writeError(w, http.StatusForbidden, "not your content")
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

	if err := h.content.UpdateBody(r.Context(), id, req.Title, req.BodyMarkdown); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "saved"})
}
