package http

import (
	"encoding/json"
	"net/http"

	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// ComposeHandler triggers article generation workflows.
type ComposeHandler struct {
	jobs ports.JobRepository
}

func NewComposeHandler(jobs ports.JobRepository) *ComposeHandler {
	return &ComposeHandler{jobs: jobs}
}

// GenerateTopic enqueues a topic generation job.
func (h *ComposeHandler) GenerateTopic(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())

	payload := json.RawMessage(`{}`)
	job := &domain.Job{
		UserID:  userID,
		Type:    "generate_topic",
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

// WriteArticle enqueues an article writing job.
func (h *ComposeHandler) WriteArticle(w http.ResponseWriter, r *http.Request) {
	userID, _ := UserIDFromContext(r.Context())

	var body struct {
		TopicID string `json:"topic_id"`
		Voice   string `json:"voice"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	payload, _ := json.Marshal(body)
	job := &domain.Job{
		UserID:  userID,
		Type:    "write_article",
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
