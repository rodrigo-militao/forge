package http

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/ports"
	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

// SourcesHandler handles CRUD for digest content sources.
type SourcesHandler struct {
	sources digest.SourceRepository
	users   ports.UserRepository
}

func NewSourcesHandler(sources digest.SourceRepository, users ports.UserRepository) *SourcesHandler {
	return &SourcesHandler{sources: sources, users: users}
}

func (h *SourcesHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	items, err := h.sources.ListByUser(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list sources")
		return
	}
	writeJSON(w, http.StatusOK, items)
}

type createSourceInput struct {
	Name   string          `json:"name"`
	Type   digest.SourceType `json:"type"`
	Config json.RawMessage `json:"config"`
}

func (h *SourcesHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var input createSourceInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.Name == "" || input.Type == "" {
		writeError(w, http.StatusBadRequest, "name and type are required")
		return
	}

	source, err := h.sources.Create(r.Context(), userID, input.Name, input.Type, input.Config)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create source")
		return
	}
	writeJSON(w, http.StatusCreated, source)
}

type updateSourceInput struct {
	Name    string          `json:"name"`
	Type    digest.SourceType `json:"type"`
	Config  json.RawMessage `json:"config"`
	Enabled bool            `json:"enabled"`
}

func (h *SourcesHandler) Update(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	var input updateSourceInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}

	if input.Enabled {
		user, err := h.users.GetByID(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to check limits")
			return
		}
		existing, _ := h.sources.ListByUser(r.Context(), userID)
		count := 0
		for _, s := range existing {
			if s.ID == id {
				continue // don't count the source being updated
			}
			if s.Enabled {
				count++
			}
		}
		if count >= user.MaxActiveSources {
			writeError(w, http.StatusConflict, "max_active_sources limit reached")
			return
		}
	}

	updated, err := h.sources.Update(r.Context(), id, userID, input.Name, input.Type, input.Config, input.Enabled)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update source")
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (h *SourcesHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	idStr := chi.URLParam(r, "id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid id")
		return
	}

	if err := h.sources.Delete(r.Context(), id, userID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete source")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
