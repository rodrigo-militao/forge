package domain

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// EditionStatus tracks the lifecycle of a newsletter edition.
type EditionStatus string

const (
	EditionDraft    EditionStatus = "draft"
	EditionExported EditionStatus = "exported"
)

// Edition is a curated collection of approved digest items assembled
// into a single editable document (ADR 0029).
type Edition struct {
	ID           uuid.UUID
	UserID       uuid.UUID
	Title        string
	Introduction string // LLM-generated intro, editable by user
	Status       EditionStatus
	Items        []EditionItem
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

// EditionItem is a single approved article within an edition.
type EditionItem struct {
	ID          uuid.UUID
	EditionID   uuid.UUID
	ContentID   uuid.UUID
	SortOrder   int
	Title       string
	BodySummary string
	SourceURL   string
	CreatedAt   time.Time
}

// EditionRepository persists newsletter editions.
type EditionRepository interface {
	Create(ctx context.Context, edition *Edition) error
	GetByID(ctx context.Context, id uuid.UUID) (*Edition, error)
	ListByUser(ctx context.Context, userID uuid.UUID) ([]Edition, error)
	UpdateBody(ctx context.Context, id uuid.UUID, title, introduction string) error
	UpdateStatus(ctx context.Context, id uuid.UUID, status EditionStatus) error
	// ListUsedContentIDs returns content_ids that already appear in any edition.
	ListUsedContentIDs(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error)
}
