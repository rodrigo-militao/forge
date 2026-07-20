package http

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/rodrigo-militao/forge/internal/core/application"
	"github.com/rodrigo-militao/forge/internal/core/domain"
)

// ReferenceHandler manages the HTTP interface for References (Sprint 3).
type ReferenceHandler struct {
	svc *application.ReferenceService
}

func NewReferenceHandler(svc *application.ReferenceService) *ReferenceHandler {
	return &ReferenceHandler{svc: svc}
}

// --- CRUD ---

func (h *ReferenceHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())
	var req struct {
		URL           string  `json:"url"`
		Title         *string `json:"title"`
		Description   *string `json:"description"`
		SourceName    *string `json:"source_name"`
		ReferenceType string  `json:"reference_type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	ref, err := h.svc.CreateReference(r.Context(), userID, &req.URL, req.Title, req.Description, req.SourceName, domain.ReferenceType(req.ReferenceType))
	if err != nil {
		refError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, ref)
}

func (h *ReferenceHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())
	refs, err := h.svc.ListReferences(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list references")
		return
	}
	writeJSON(w, http.StatusOK, refs)
}

func (h *ReferenceHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid reference id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())
	ref, err := h.svc.GetReference(r.Context(), id, userID)
	if err != nil {
		refError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ref)
}

func (h *ReferenceHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid reference id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())
	var req struct {
		URL           *string `json:"url"`
		Title         *string `json:"title"`
		Description   *string `json:"description"`
		SourceName    *string `json:"source_name"`
		ReferenceType *string `json:"reference_type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	refType := domain.ReferenceTypeWebsite
	if req.ReferenceType != nil {
		refType = domain.ReferenceType(*req.ReferenceType)
	}
	ref, err := h.svc.UpdateReference(r.Context(), id, userID, req.URL, req.Title, req.Description, req.SourceName, refType)
	if err != nil {
		refError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, ref)
}

func (h *ReferenceHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, ok := parseUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid reference id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())
	if err := h.svc.DeleteReference(r.Context(), id, userID); err != nil {
		refError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// --- Idea relationships ---

func (h *ReferenceHandler) ListIdeaReferences(w http.ResponseWriter, r *http.Request) {
	ideaID, ok := parseUUID(r, "ideaID")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid idea id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())
	refs, err := h.svc.ListIdeaReferences(r.Context(), ideaID, userID)
	if err != nil {
		refError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, refs)
}

func (h *ReferenceHandler) AttachToIdea(w http.ResponseWriter, r *http.Request) {
	ideaID, ok := parseUUID(r, "ideaID")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid idea id")
		return
	}
	refID, ok := parseUUID(r, "referenceId")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid reference id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())
	if err := h.svc.AttachReferenceToIdea(r.Context(), ideaID, refID, userID); err != nil {
		refError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "attached"})
}

func (h *ReferenceHandler) DetachFromIdea(w http.ResponseWriter, r *http.Request) {
	ideaID, ok := parseUUID(r, "ideaID")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid idea id")
		return
	}
	refID, ok := parseUUID(r, "referenceId")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid reference id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())
	if err := h.svc.DetachReferenceFromIdea(r.Context(), ideaID, refID, userID); err != nil {
		refError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "detached"})
}

// --- Article relationships ---

func (h *ReferenceHandler) ListContentReferences(w http.ResponseWriter, r *http.Request) {
	contentID, ok := parseUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid content id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())
	refs, err := h.svc.ListArticleReferences(r.Context(), contentID, userID)
	if err != nil {
		refError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, refs)
}

func (h *ReferenceHandler) AttachToContent(w http.ResponseWriter, r *http.Request) {
	contentID, ok := parseUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid content id")
		return
	}
	refID, ok := parseUUID(r, "referenceId")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid reference id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())
	if err := h.svc.AttachReferenceToArticle(r.Context(), contentID, refID, userID); err != nil {
		refError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "attached"})
}

func (h *ReferenceHandler) DetachFromContent(w http.ResponseWriter, r *http.Request) {
	contentID, ok := parseUUID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid content id")
		return
	}
	refID, ok := parseUUID(r, "referenceId")
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid reference id")
		return
	}
	userID, _ := UserIDFromContext(r.Context())
	if err := h.svc.DetachReferenceFromArticle(r.Context(), contentID, refID, userID); err != nil {
		refError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "detached"})
}

// refError maps ReferenceService errors to HTTP status codes.
func refError(w http.ResponseWriter, err error) {
	if err == nil {
		return
	}
	if errors.Is(err, domain.ErrNotFound) {
		writeError(w, http.StatusNotFound, "not found")
		return
	}
	if errors.Is(err, domain.ErrNotOwned) {
		writeError(w, http.StatusForbidden, "not your content")
		return
	}
	if errors.Is(err, domain.ErrInvalidInput) {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeError(w, http.StatusInternalServerError, "operation failed")
}

// parseUUID extracts and parses a UUID path parameter.
func parseUUID(r *http.Request, param string) (uuid.UUID, bool) {
	raw := chi.URLParam(r, param)
	id, err := uuid.Parse(raw)
	return id, err == nil
}
