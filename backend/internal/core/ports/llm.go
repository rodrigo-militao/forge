package ports

import (
	"context"

	"github.com/rodrigo-militao/forge/internal/core/domain"
)

// LLMClient abstracts over any LLM provider (OpenAI-compatible, Anthropic, etc.).
type LLMClient interface {
	Complete(ctx context.Context, req domain.LLMRequest) (*domain.LLMResponse, error)
}
