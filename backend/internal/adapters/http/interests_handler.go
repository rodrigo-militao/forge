package http

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/ports"
	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

// InterestsHandler handles CRUD for digest interests (ADR 0032).
type InterestsHandler struct {
	interests digest.DigestInterestRepository
	users     ports.UserRepository
}

// NewInterestsHandler creates an interests handler.
func NewInterestsHandler(interests digest.DigestInterestRepository, users ports.UserRepository) *InterestsHandler {
	return &InterestsHandler{interests: interests, users: users}
}

// List returns all interests for the authenticated user.
func (h *InterestsHandler) List(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	items, err := h.interests.ListByUser(r.Context(), userID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list interests")
		return
	}

	writeJSON(w, http.StatusOK, items)
}

type createInterestInput struct {
	Label string `json:"label"`
}

// Create adds a new interest for the authenticated user.
func (h *InterestsHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var input createInterestInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil || input.Label == "" {
		writeError(w, http.StatusBadRequest, "label is required")
		return
	}

	interest, err := h.interests.Create(r.Context(), userID, input.Label)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create interest")
		return
	}

	writeJSON(w, http.StatusCreated, interest)
}

type toggleInterestInput struct {
	Enabled bool `json:"enabled"`
}

// UpdateEnabled toggles an interest active/inactive with limit check.
func (h *InterestsHandler) UpdateEnabled(w http.ResponseWriter, r *http.Request) {
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

	var input toggleInterestInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	if input.Enabled {
		user, err := h.users.GetByID(r.Context(), userID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to check limits")
			return
		}
		existing, _ := h.interests.ListByUser(r.Context(), userID)
		count := 0
		for _, item := range existing {
			if item.ID == id {
				continue
			}
			if item.Enabled {
				count++
			}
		}
		if count >= user.MaxActiveInterests {
			writeError(w, http.StatusConflict, "max_active_interests limit reached")
			return
		}
	}

	if err := h.interests.UpdateEnabled(r.Context(), id, userID, input.Enabled); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to update interest")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// Delete removes an interest.
func (h *InterestsHandler) Delete(w http.ResponseWriter, r *http.Request) {
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

	if err := h.interests.Delete(r.Context(), id, userID); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete interest")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
