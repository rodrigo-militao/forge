// Package wiring is the composition root for Forge's worker process.
// It constructs and wires all adapters and application services.
package wiring

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rodrigo-militao/forge/internal/adapters/llm"
	"github.com/rodrigo-militao/forge/internal/adapters/postgres"
	composeApp "github.com/rodrigo-militao/forge/internal/compose/application"
	composeDomain "github.com/rodrigo-militao/forge/internal/compose/domain"
	coredomain "github.com/rodrigo-militao/forge/internal/core/domain"
	digestApp "github.com/rodrigo-militao/forge/internal/digest/application"
	digestDomain "github.com/rodrigo-militao/forge/internal/digest/domain"
	"github.com/rodrigo-militao/forge/internal/digest/adapters/rss"
	"github.com/rodrigo-militao/forge/internal/digest/adapters/search"
	"github.com/rodrigo-militao/forge/internal/worker"
)

// WorkerConfig contains the runtime configuration for the worker process.
type WorkerConfig struct {
	Pool       *pgxpool.Pool
	LLMAPIKey  string
	LLMBaseURL string
}

// BuildWorkerHandlers constructs all adapters and returns the job handler map.
func BuildWorkerHandlers(cfg WorkerConfig) map[string]worker.Handler {
	contentRepo := postgres.NewContentRepository(cfg.Pool)
	topicsRepo := postgres.NewTopicRepository(cfg.Pool)
	editionsRepo := postgres.NewEditionRepository(cfg.Pool)
	jobsRepo := postgres.NewJobRepository(cfg.Pool)
	rawLLM := llm.NewClient(cfg.LLMAPIKey, cfg.LLMBaseURL)
	llmClient := llm.NewLoggingWrapper(rawLLM)
	rawCheap := llm.NewClient(cfg.LLMAPIKey, cfg.LLMBaseURL, llm.WithModel("deepseek-chat"))
	cheapLLM := llm.NewLoggingWrapper(rawCheap)

	return map[string]worker.Handler{
		"curate_digest": func(ctx context.Context, userID string, payload []byte) error {
			id, err := uuid.Parse(userID)
			if err != nil {
				return fmt.Errorf("invalid user id: %w", err)
			}

			userRepo := postgres.NewUserRepository(cfg.Pool)
			sourceRepo := postgres.NewSourceRepository(cfg.Pool)
			configs, err := sourceRepo.ListByUser(ctx, id)
			if err != nil {
				return fmt.Errorf("fetching sources: %w", err)
			}

			user, err := userRepo.GetByID(ctx, id)
			if err != nil {
				return fmt.Errorf("fetching user: %w", err)
			}

			sources := buildContentSources(configs)
			if len(sources) == 0 {
				if user.RestrictSearchToSources {
					slog.Info("curate_digest: restrict_search enabled and no sources configured, skipping")
					return nil
				}
				// Fallback: hardcoded defaults when user has no configured sources.
				slog.Info("curate_digest: no configured sources, using defaults")
				sources = []digestDomain.ContentSource{
					rss.NewFeed("Go Blog", "https://go.dev/blog/feed.atom"),
					search.NewDuckDuckGo([]string{"golang best practices 2026"}),
				}
			}

			svc := digestApp.NewDiscoveryService(llmClient, sources, contentRepo, contentRepo, id)
			result, err := svc.Run(ctx, time.Now())
			if err != nil {
				return fmt.Errorf("digest run: %w", err)
			}
			_ = result

			// Enqueue batch categorization after discovery
			if err := jobsRepo.Create(ctx, &coredomain.Job{
				UserID:  id,
				Type:    "categorize_batch",
				Payload: []byte("{}"),
			}); err != nil {
				slog.Warn("failed to enqueue categorize_batch", "error", err)
			}
			return nil
		},

		"categorize_batch": func(ctx context.Context, userID string, payload []byte) error {
			id, err := uuid.Parse(userID)
			if err != nil {
				return fmt.Errorf("invalid user id: %w", err)
			}
			svc := digestApp.NewCategorizeService(cheapLLM, contentRepo, contentRepo, id)
			return svc.Run(ctx)
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

		"assemble_edition": func(ctx context.Context, userID string, payload []byte) error {
			svc := digestApp.NewEditionService(contentRepo, contentRepo, editionsRepo)
			var req struct {
				ContentIDs []string `json:"content_ids"`
			}
			if len(payload) > 0 && string(payload) != "{}" {
				if err := json.Unmarshal(payload, &req); err != nil {
					slog.Warn("assemble_edition: ignoring invalid payload", "error", err)
				}
			}
			result, err := svc.Assemble(ctx, userID, req.ContentIDs...)
			if err != nil {
				return fmt.Errorf("edition assembly: %w", err)
			}
			slog.Info("edition assembled", "items", result.ItemCount)
			return nil
		},

		"compose_generate_draft": func(ctx context.Context, userID string, payload []byte) error {
			id, err := uuid.Parse(userID)
			if err != nil {
				return fmt.Errorf("invalid user id: %w", err)
			}
			var req struct {
				Theme string `json:"theme"`
			}
			if err := json.Unmarshal(payload, &req); err != nil || req.Theme == "" {
				return fmt.Errorf("invalid payload: theme required")
			}
			topic := &composeDomain.Topic{
				Topic:             req.Theme,
				ThemeArea:         composeDomain.ThemePersonalDev,
				Format:            composeDomain.FormatEssay,
				OneLinePitch:      "Generated on demand",
				TargetLengthWords: 1200,
			}
			voice, err := composeDomain.SelectVoice(topic.ThemeArea, topic.Format)
			if err != nil {
				voice = composeDomain.VoiceConfessional
			}
			svc := composeApp.NewWriterService(llmClient, contentRepo, id)
			result, err := svc.Generate(ctx, composeApp.GenerateParams{
				Topic:             *topic,
				Voice:             voice,
				TargetLengthWords: 1200,
			})
			if err != nil {
				return fmt.Errorf("draft generation: %w", err)
			}
			_ = result
			return nil
		},

		"compose_transform": func(ctx context.Context, userID string, payload []byte) error {
			var req struct {
				Text   string `json:"text"`
				Action string `json:"action"`
			}
			if err := json.Unmarshal(payload, &req); err != nil || req.Text == "" {
				return fmt.Errorf("invalid payload: text required")
			}
			id, err := uuid.Parse(userID)
			if err != nil {
				return fmt.Errorf("invalid user id: %w", err)
			}
			svc := composeApp.NewTransformService(llmClient, contentRepo, id)
			return svc.Run(ctx, composeApp.TransformOptions{Text: req.Text, Action: req.Action})
		},

		"compose_write": func(ctx context.Context, userID string, payload []byte) error {
			return fmt.Errorf("compose_write handler not yet implemented")
		},
	}
}

// buildContentSources converts DB SourceConfigs into ContentSource adapters.
func buildContentSources(configs []digestDomain.SourceConfig) []digestDomain.ContentSource {
	sources := make([]digestDomain.ContentSource, 0, len(configs))
	for _, cfg := range configs {
		if !cfg.Enabled {
			continue
		}
		switch cfg.Type {
		case digestDomain.SourceTypeRSS:
			var opts struct{ URL string `json:"url"` }
			if err := json.Unmarshal(cfg.Config, &opts); err != nil || opts.URL == "" {
				continue
			}
			sources = append(sources, rss.NewFeed(cfg.Name, opts.URL))
		case digestDomain.SourceTypeWebSearch:
			var opts struct{ Query string `json:"query"` }
			if err := json.Unmarshal(cfg.Config, &opts); err != nil || opts.Query == "" {
				continue
			}
			sources = append(sources, search.NewDuckDuckGo([]string{opts.Query}))
		}
	}
	return sources
}

func strPtr(s string) *string { return &s }
