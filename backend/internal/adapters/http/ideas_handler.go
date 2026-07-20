package http

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/rodrigo-militao/forge/internal/core/application"
	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

type IdeasHandler struct {
	svc      ports.IdeaRepository
	ideasSvc *application.IdeasService
}

func NewIdeasHandler(svc ports.IdeaRepository, ideasSvc *application.IdeasService) *IdeasHandler {
	return &IdeasHandler{svc: svc, ideasSvc: ideasSvc}
}

func (h *IdeasHandler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Route("/{ideaID}", func(r chi.Router) {
		r.Get("/", h.Get)
		r.Put("/", h.Update)
		r.Delete("/", h.Archive)
		r.Post("/tags", h.AddTag)
		r.Delete("/tags/{tag}", h.RemoveTag)
		r.Post("/promote", h.Promote)
	})
	return r
}

func (h *IdeasHandler) userID(r *http.Request) uuid.UUID {
	id, _ := UserIDFromContext(r.Context())
	return id
}

func (h *IdeasHandler) ideaID(r *http.Request) (uuid.UUID, bool) {
	id, err := uuid.Parse(chi.URLParam(r, "ideaID"))
	if err != nil {
		return uuid.Nil, false
	}
	return id, true
}

func (h *IdeasHandler) List(w http.ResponseWriter, r *http.Request) {
	ideas, err := h.svc.ListByUser(r.Context(), h.userID(r))
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list ideas")
		return
	}
	writeJSON(w, http.StatusOK, ideas)
}

func (h *IdeasHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, ok := h.ideaID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid idea id")
		return
	}
	idea, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "idea not found")
		return
	}
	writeJSON(w, http.StatusOK, idea)
}

func (h *IdeasHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Title      string  `json:"title"`
		Context    *string `json:"context"`
		Notes      *string `json:"notes"`
		References *string `json:"references"`
		Priority   string  `json:"priority"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Title == "" {
		writeError(w, http.StatusBadRequest, "title is required")
		return
	}
	priority := domain.IdeaPriority(req.Priority)
	switch priority {
	case domain.PriorityLow, domain.PriorityMedium, domain.PriorityHigh:
	default:
		priority = domain.PriorityMedium
	}
	idea := &domain.Idea{
		UserID:     h.userID(r),
		Title:      req.Title,
		Context:    req.Context,
		Notes:      req.Notes,
		References: req.References,
		Priority:   priority,
		Status:     domain.IdeaStatusOpen,
	}
	if err := h.svc.Create(r.Context(), idea); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create idea")
		return
	}
	writeJSON(w, http.StatusCreated, idea)
}

func (h *IdeasHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, ok := h.ideaID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid idea id")
		return
	}
	existing, err := h.svc.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "idea not found")
		return
	}
	var req struct {
		Title      *string `json:"title"`
		Context    *string `json:"context"`
		Notes      *string `json:"notes"`
		References *string `json:"references"`
		Priority   *string `json:"priority"`
		Status     *string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Title != nil {
		existing.Title = *req.Title
	}
	if req.Context != nil {
		existing.Context = req.Context
	}
	if req.Notes != nil {
		existing.Notes = req.Notes
	}
	if req.References != nil {
		existing.References = req.References
	}
	if req.Priority != nil {
		existing.Priority = domain.IdeaPriority(*req.Priority)
	}
	if req.Status != nil {
		existing.Status = domain.IdeaStatus(*req.Status)
	}
	if err := h.svc.Update(r.Context(), existing); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update idea")
		return
	}
	writeJSON(w, http.StatusOK, existing)
}

func (h *IdeasHandler) Archive(w http.ResponseWriter, r *http.Request) {
	id, ok := h.ideaID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid idea id")
		return
	}
	if err := h.svc.Archive(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to archive idea")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "archived"})
}

func (h *IdeasHandler) AddTag(w http.ResponseWriter, r *http.Request) {
	id, ok := h.ideaID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid idea id")
		return
	}
	var req struct {
		Label string `json:"label"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if err := h.svc.AddTag(r.Context(), id, req.Label, h.userID(r)); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to add tag")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "tag added"})
}

func (h *IdeasHandler) RemoveTag(w http.ResponseWriter, r *http.Request) {
	id, ok := h.ideaID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid idea id")
		return
	}
	tag := chi.URLParam(r, "tag")
	if err := h.svc.RemoveTag(r.Context(), id, tag, h.userID(r)); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to remove tag")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "tag removed"})
}

func (h *IdeasHandler) Promote(w http.ResponseWriter, r *http.Request) {
	id, ok := h.ideaID(r)
	if !ok {
		writeError(w, http.StatusBadRequest, "invalid idea id")
		return
	}
	article, err := h.ideasSvc.PromoteToArticle(r.Context(), id, h.userID(r))
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			writeError(w, http.StatusNotFound, "idea not found")
			return
		}
		if errors.Is(err, domain.ErrNotOwned) {
			writeError(w, http.StatusForbidden, "not your idea")
			return
		}
		writeError(w, http.StatusInternalServerError, "failed to promote idea")
		return
	}
	writeJSON(w, http.StatusCreated, article)
}
