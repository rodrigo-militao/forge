package http

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// enqueueJob returns an HTTP handler that creates a job and returns 202 Accepted.
// The caller is responsible for calling the handler, which parses the user from
// the request context, optionally decodes the request body as JSON, and enqueues
// the job for async processing.
func enqueueJob(jobs ports.JobRepository, jobType string, withBody bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := UserIDFromContext(r.Context())
		if !ok {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		var payload []byte
		if withBody {
			body := make(map[string]any)
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				writeError(w, http.StatusBadRequest, "invalid JSON body")
				return
			}
			payload, _ = json.Marshal(body)
		} else {
			payload = []byte("{}")
		}

		job := &domain.Job{
			UserID:  userID,
			Type:    jobType,
			Payload: payload,
		}
		if err := jobs.Create(r.Context(), job); err != nil {
			slog.Warn("enqueue failed", "job_type", jobType, "error", err)
			writeError(w, http.StatusInternalServerError, "failed to enqueue job")
			return
		}

		writeJSON(w, http.StatusAccepted, map[string]string{
			"job_id": job.ID.String(),
			"status": "enqueued",
		})
	}
}

// compile-time check that uuid is used (required by domain.Job.UserID type)
var _ = uuid.UUID{}
