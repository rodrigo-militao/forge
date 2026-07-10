package domain

import (
	"context"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// TopicRepository persists topic configurations and history.
type TopicRepository interface {
	ListByUser(ctx context.Context, userID uuid.UUID) ([]Topic, error)
	Create(ctx context.Context, topic *Topic) error
	History(ctx context.Context, userID uuid.UUID, limit int) ([]HistoryEntry, error)
	AppendHistory(ctx context.Context, entry HistoryEntry) error
}

// ComposeApplication bundles the ports a compose use-case needs.
type ComposeApplication struct {
	LLM     ports.LLMClient
	Topics  TopicRepository
	Content ports.ContentRepository
}
