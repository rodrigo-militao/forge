package domain

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// JobStatus tracks async job lifecycle (ADR 0028).
type JobStatus string

const (
	JobPending    JobStatus = "pending"
	JobProcessing JobStatus = "processing"
	JobDone       JobStatus = "done"
	JobFailed     JobStatus = "failed"
)

// Job is a unit of async work queued in Postgres (ADR 0028).
type Job struct {
	ID        uuid.UUID       `json:"id"`
	UserID    uuid.UUID       `json:"user_id"`
	Type      string          `json:"type"`
	Status    JobStatus       `json:"status"`
	Payload   json.RawMessage `json:"payload"`
	Error     *string         `json:"error"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}
