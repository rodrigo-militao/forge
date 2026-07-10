package domain

// DigestPorts hold the interfaces that Digest's application layer depends on.
// Implemented by adapters; defined here to keep the dependency inversion.

import (
	"context"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// SourceRepository persists tenant source configurations.
type SourceRepository interface {
	ListByUser(ctx context.Context, userID uuid.UUID) ([]SourceConfig, error)
	Create(ctx context.Context, cfg *SourceConfig) error
	Update(ctx context.Context, cfg *SourceConfig) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// DigestApplication bundles the ports a digest use-case needs.
type DigestApplication struct {
	LLM      ports.LLMClient
	Sources  SourceRepository
	Content  ports.ContentRepository
}
