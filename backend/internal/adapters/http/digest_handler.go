package http

import (
	"encoding/json"
	"net/http"

	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// DigestHandler triggers digest/curation workflows.
type DigestHandler struct {
	jobs ports.JobRepository
}

func NewDigestHandler(jobs ports.JobRepository) *DigestHandler {
	return &DigestHandler{jobs: jobs}
}

// Run enqueues a digest curation job.
func (h *DigestHandler) Run(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())

	payload := json.RawMessage(`{}`)
	job := &domain.Job{
		UserID:  userID,
		Type:    "curate_digest",
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
