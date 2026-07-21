package domain

import (
	"time"

	"github.com/google/uuid"
)

type IdeaPriority string

const (
	PriorityLow    IdeaPriority = "low"
	PriorityMedium IdeaPriority = "medium"
	PriorityHigh   IdeaPriority = "high"
)

type IdeaStatus string

const (
	IdeaStatusOpen       IdeaStatus = "open"
	IdeaStatusInProgress IdeaStatus = "in_progress"
	IdeaStatusUsed       IdeaStatus = "used"
	IdeaStatusArchived   IdeaStatus = "archived"
)

type Idea struct {
	ID         uuid.UUID      `json:"id"`
	UserID     uuid.UUID      `json:"user_id"`
	Title      string         `json:"title"`
	Context    *string        `json:"context"`
	Notes      *string        `json:"notes"`
	References *string        `json:"references"`
	Priority   IdeaPriority   `json:"priority"`
	Status     IdeaStatus     `json:"status"`
	Tags       []string       `json:"tags"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
}
func (i *Idea) GetUserID() uuid.UUID { return i.UserID }

