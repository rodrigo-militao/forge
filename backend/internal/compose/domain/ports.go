package domain

import (
	"context"

	"github.com/google/uuid"
)

// TopicRepository persists topic configurations and history.
type TopicRepository interface {
	ListByUser(ctx context.Context, userID uuid.UUID) ([]Topic, error)
	Create(ctx context.Context, topic *Topic) error
	History(ctx context.Context, userID uuid.UUID, limit int) ([]HistoryEntry, error)
}
