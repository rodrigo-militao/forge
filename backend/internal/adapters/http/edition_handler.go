package http

import (
	"encoding/json"
	"net/http"

	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// EditionHandler triggers newsletter edition workflows (ADR 0029).
type EditionHandler struct {
	jobs ports.JobRepository
}

func NewEditionHandler(jobs ports.JobRepository) *EditionHandler {
	return &EditionHandler{jobs: jobs}
}

// Assemble enqueues an edition assembly job.
func (h *EditionHandler) Assemble(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())

	payload := json.RawMessage(`{}`)
	job := &domain.Job{
		UserID:  userID,
		Type:    "assemble_edition",
		Payload: payload,
	}
	if err := h.jobs.Create(r.Context(), job); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to enqueue job")
		return
	}

	writeJSON(w, http.StatusAccepted, map[string]string{
		"job_id": job.ID.String(),
		"status": "enqueued",
	})
}
