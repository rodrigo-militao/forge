package http

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

// DigestHandler serves digest-specific endpoints.
type DigestHandler struct {
	content  ports.ContentDigestReader
	editions digest.EditionRepository
	jobs     ports.JobRepository
}

// NewDigestHandler creates a digest handler.
func NewDigestHandler(content ports.ContentDigestReader, editions digest.EditionRepository, jobs ports.JobRepository) *DigestHandler {
	return &DigestHandler{content: content, editions: editions, jobs: jobs}
}

// digestStatsResponse extends DigestStats with active job info.
type digestStatsResponse struct {
	TotalCount        int        `json:"total_count"`
	InNewsletterCount int        `json:"in_newsletter_count"`
	LastDiscovery     *time.Time `json:"last_discovery"`
	DraftNewsletters  int        `json:"draft_newsletters"`
	ActiveJobID       *string    `json:"active_job_id"`
	ActiveJobStatus   *string    `json:"active_job_status"`
}

// GetStats returns aggregate statistics for the Digest page.
func (h *DigestHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	stats, err := h.content.GetDigestStats(r.Context(), userID)
	if err != nil {
		slog.Error("digest stats: query failed", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to get stats")
		return
	}

	resp := digestStatsResponse{
		TotalCount:        stats.TotalCount,
		InNewsletterCount: stats.InNewsletterCount,
		LastDiscovery:     stats.LastDiscovery,
		DraftNewsletters:  stats.DraftNewsletters,
	}

	activeJob, _ := h.jobs.FindActiveByUserAndType(r.Context(), userID, "curate_digest")
	if activeJob != nil {
		s := string(activeJob.Status)
		idStr := activeJob.ID.String()
		resp.ActiveJobID = &idStr
		resp.ActiveJobStatus = &s
	}

	writeJSON(w, http.StatusOK, resp)
}

// jobResponse is the JSON DTO for a job.
type jobResponse struct {
	ID        string  `json:"id"`
	Type      string  `json:"type"`
	Status    string  `json:"status"`
	Error     *string `json:"error"`
	CreatedAt string  `json:"created_at"`
	UpdatedAt string  `json:"updated_at"`
}

func jobToResponse(j domain.Job) jobResponse {
	return jobResponse{
		ID:        j.ID.String(),
		Type:      j.Type,
		Status:    string(j.Status),
		Error:     j.Error,
		CreatedAt: j.CreatedAt.Format(time.RFC3339),
		UpdatedAt: j.UpdatedAt.Format(time.RFC3339),
	}
}

// ListJobs returns recent jobs for the authenticated user.
func (h *DigestHandler) ListJobs(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	jobs, err := h.jobs.ListByUser(r.Context(), userID, 5)
	if err != nil {
		slog.Error("digest jobs: list failed", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to list jobs")
		return
	}

	result := make([]jobResponse, len(jobs))
	for i, j := range jobs {
		result[i] = jobToResponse(j)
	}
	writeJSON(w, http.StatusOK, result)
}

// CancelJob cancels the active digest job for the authenticated user.
func (h *DigestHandler) CancelJob(w http.ResponseWriter, r *http.Request) {
	userID, ok := UserIDFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	active, err := h.jobs.FindActiveByUserAndType(r.Context(), userID, "curate_digest")
	if err != nil {
		slog.Error("digest cancel: find active failed", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to check active jobs")
		return
	}
	if active == nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	errMsg := "cancelled by user"
	if err := h.jobs.UpdateStatus(r.Context(), active.ID, domain.JobFailed, &errMsg); err != nil {
		slog.Error("digest cancel: update failed", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to cancel job")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "cancelled"})
}
