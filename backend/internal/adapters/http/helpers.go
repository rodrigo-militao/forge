package http

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/application"
	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// enqueueJob returns an HTTP handler that creates a job and returns 202 Accepted.
// It checks the user's monthly generation quota before enqueuing.
func enqueueJob(jobs ports.JobRepository, usages ports.UsageCounterRepository, jobType string, withBody bool, plans *application.Plans) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := UserIDFromContext(r.Context())
		if !ok {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		if err := plans.CheckMonthGenerationQuota(r.Context(), userID, usages); err != nil {
			writeErrorWithCode(w, http.StatusTooManyRequests, err)
			return
		}
		monthName := ""

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

		// Increment usage counter
		if _, incErr := usages.Increment(r.Context(), userID, monthName); incErr != nil {
			slog.Warn("usage counter increment failed", "error", incErr)
		}

		writeJSON(w, http.StatusAccepted, map[string]string{
			"job_id": job.ID.String(),
			"status": "enqueued",
		})
	}
}

// compile-time check that uuid is used (required by domain.Job.UserID type)
var _ = uuid.UUID{}
