package application

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/ports"
	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

// DigestPipelineParams holds the dependencies and configuration for a full
// digest curation run: discovery (fetch + LLM classify) then categorization.
type DigestPipelineParams struct {
	UserID            uuid.UUID
	LLM               ports.LLMClient
	CheapLLM          ports.LLMClient
	Content           ports.ContentRepository
	Sources           []digest.ContentSource
	InterestLabels    []string
	RestrictToSources bool
	FallbackSources   []digest.ContentSource
}

// RunDigestPipeline executes a full digest curation cycle: loads sources,
// runs discovery (fetch → LLM classify → persist), then batch categorizes.
func RunDigestPipeline(ctx context.Context, params DigestPipelineParams) error {
	sources := params.Sources

	if len(sources) == 0 {
		if params.RestrictToSources {
			slog.Info("curate_digest: restrict_search enabled and no sources configured, skipping")
			return nil
		}
		slog.Info("curate_digest: no configured sources, using defaults")
		sources = params.FallbackSources
	}

	svc := NewDiscoveryService(params.LLM, sources, params.Content, params.UserID, params.InterestLabels)
	if _, err := svc.Run(ctx, time.Now()); err != nil {
		return fmt.Errorf("digest run: %w", err)
	}

	catSvc := NewCategorizeService(params.CheapLLM, params.Content, params.UserID)
	if err := catSvc.Run(ctx); err != nil {
		slog.Warn("inline categorization failed", "error", err)
	}
	return nil
}
