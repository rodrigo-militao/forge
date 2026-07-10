package worker

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rodrigo-militao/forge/internal/adapters/llm"
	"github.com/rodrigo-militao/forge/internal/adapters/postgres"
	composeApp "github.com/rodrigo-militao/forge/internal/compose/application"
	coredomain "github.com/rodrigo-militao/forge/internal/core/domain"
	digestApp "github.com/rodrigo-militao/forge/internal/digest/application"
	digestDomain "github.com/rodrigo-militao/forge/internal/digest/domain"
	"github.com/rodrigo-militao/forge/internal/digest/adapters/rss"
	"github.com/rodrigo-militao/forge/internal/digest/adapters/search"
)

// NewHandlers creates the job handler functions and a map keyed by job type.
func NewHandlers(pool *pgxpool.Pool, llmAPIKey, llmBaseURL string) map[string]Handler {
	contentRepo := postgres.NewContentRepository(pool)
	topicsRepo := postgres.NewTopicRepository(pool)

	llmClient := llm.NewClient(llmAPIKey, llmBaseURL)

	return map[string]Handler{
		"curate_digest": func(ctx context.Context, userID string, payload []byte) error {
			id, err := uuid.Parse(userID)
			if err != nil {
				return fmt.Errorf("invalid user id: %w", err)
			}

			// TODO: load user's source configs from DB
			sources := []digestDomain.ContentSource{
				rss.NewFeed("Go Blog", "https://go.dev/blog/feed.atom"),
				search.NewDuckDuckGo([]string{"golang best practices 2026"}),
			}

			svc := digestApp.NewDiscoveryService(llmClient, sources, contentRepo, id)
			result, err := svc.Run(ctx, time.Now())
			if err != nil {
				return fmt.Errorf("digest run: %w", err)
			}

			_ = result
			return nil
		},

		"generate_topic": func(ctx context.Context, userID string, payload []byte) error {
			id, err := uuid.Parse(userID)
			if err != nil {
				return fmt.Errorf("invalid user id: %w", err)
			}

			svc := composeApp.NewTopicGeneratorService(llmClient, topicsRepo, id)
			result, err := svc.Generate(ctx)
			if err != nil {
				return fmt.Errorf("topic generation: %w", err)
			}

			title := result.Topic.Topic
			if err := contentRepo.Create(ctx, &coredomain.GeneratedContent{
				UserID:       id,
				Product:      coredomain.ProductCompose,
				Status:       coredomain.ContentDraft,
				SourceType:   strPtr("topic"),
				Title:        &title,
				BodyMarkdown: &result.Topic.OneLinePitch,
			}); err != nil {
				return fmt.Errorf("persisting topic: %w", err)
			}

			return nil
		},

		"write_article": func(ctx context.Context, userID string, payload []byte) error {
			// Stub: article writing requires full Compose stack
			return nil
		},
	}
}
