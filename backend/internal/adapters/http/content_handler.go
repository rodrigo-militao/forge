package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// ContentHandler handles library and approval operations on generated content.
type ContentHandler struct {
	content ports.ContentRepository
}

func NewContentHandler(content ports.ContentRepository) *ContentHandler {
	return &ContentHandler{content: content}
}

// List returns all generated content for the authenticated user.
func (h *ContentHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())

	items, err := h.content.ListByUser(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list content")
		return
	}

	writeJSON(w, http.StatusOK, items)
}

// Approve sets content status to approved (ADR 0005).
func (h *ContentHandler) Approve(w http.ResponseWriter, r *http.Request) {
	h.updateStatus(w, r, domain.ContentApproved)
}

// Reject sets content status to rejected (ADR 0005).
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
