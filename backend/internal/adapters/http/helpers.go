package http

import (
	"encoding/json"
	"errors"
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
		enqueueJobInner(w, r, jobs, usages, jobType, withBody, plans)
	}
}

// EnqueueDigestJob is like enqueueJob for "curate_digest" but checks for an
// active job first. Returns 409 Conflict if one is already pending/processing.
func EnqueueDigestJob(jobs ports.JobRepository, usages ports.UsageCounterRepository, plans *application.Plans) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := UserIDFromContext(r.Context())
		if !ok {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		active, err := jobs.FindActiveByUserAndType(r.Context(), userID, "curate_digest")
		if err != nil {
			slog.Warn("check active digest job failed", "error", err)
			writeError(w, http.StatusInternalServerError, "failed to check active jobs")
			return
		}
		if active != nil {
			writeError(w, http.StatusConflict, "a digest discovery is already in progress")
			return
		}

		enqueueJobInner(w, r, jobs, usages, "curate_digest", false, plans)
	}
}

func enqueueJobInner(w http.ResponseWriter, r *http.Request, jobs ports.JobRepository, usages ports.UsageCounterRepository, jobType string, withBody bool, plans *application.Plans) {
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

// writeDomainError maps common domain errors to HTTP responses.
// Returns true if the error was handled (caller should stop processing).
func writeDomainError(w http.ResponseWriter, err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, domain.ErrNotOwned) {
		writeError(w, http.StatusForbidden, "forbidden")
	} else if errors.Is(err, domain.ErrNotFound) {
		writeError(w, http.StatusNotFound, "not found")
	} else if errors.Is(err, domain.ErrInvalidInput) {
		writeError(w, http.StatusBadRequest, err.Error())
	} else {
		slog.Error("operation failed", "error", err)
		writeError(w, http.StatusInternalServerError, "operation failed")
	}
	return true
}

// compile-time check that uuid is used (required by domain.Job.UserID type)
var _ = uuid.UUID{}
