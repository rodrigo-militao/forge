package llm

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// LoggingWrapper adds structured logging and latency tracking around any LLMClient.
// It implements ports.LLMClient so it can be used as a drop-in replacement.
type LoggingWrapper struct {
	inner ports.LLMClient
}

// NewLoggingWrapper creates a logging decorator for an LLM client.
func NewLoggingWrapper(inner ports.LLMClient) *LoggingWrapper {
	return &LoggingWrapper{inner: inner}
}

// Complete delegates to the inner client with observability.
func (w *LoggingWrapper) Complete(ctx context.Context, req domain.LLMRequest) (*domain.LLMResponse, error) {
	start := time.Now()

	resp, err := w.inner.Complete(ctx, req)

	latency := time.Since(start)
	attrs := []slog.Attr{
		slog.Duration("latency", latency),
		slog.Int("max_tokens", req.MaxTokens),
		slog.Float64("temperature", req.Temperature),
	}

	if resp != nil {
		attrs = append(attrs,
			slog.Int("input_tokens", resp.Usage.InputTokens),
			slog.Int("output_tokens", resp.Usage.OutputTokens),
		)
	}

	if err != nil {
		attrs = append(attrs, slog.String("error", err.Error()))
		slog.LogAttrs(ctx, slog.LevelError, "llm complete failed", attrs...)
		return nil, fmt.Errorf("llm: %w", err)
	}

	slog.LogAttrs(ctx, slog.LevelInfo, "llm complete ok", attrs...)
	return resp, nil
}
