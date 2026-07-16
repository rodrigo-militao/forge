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
	"github.com/rodrigo-militao/forge/internal/lib"
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
	rawLLM := llm.NewClient(cfg.LLMAPIKey, cfg.LLMBaseURL)
	llmClient := llm.NewLoggingWrapper(rawLLM)
	rawCheap := llm.NewClient(cfg.LLMAPIKey, cfg.LLMBaseURL)
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

			// Add DuckDuckGo searches from enabled interests
			interestsRepo := postgres.NewDigestInterestRepository(cfg.Pool)
			interestList, err := interestsRepo.ListByUser(ctx, id)
			var interestLabels []string
			if err == nil {
				for _, interest := range interestList {
					if interest.Enabled {
						sources = append(sources, search.NewDuckDuckGo([]string{interest.Label}))
						interestLabels = append(interestLabels, interest.Label)
					}
				}
			}

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

			svc := digestApp.NewDiscoveryService(llmClient, sources, contentRepo, contentRepo, id, interestLabels)
			if _, err := svc.Run(ctx, time.Now()); err != nil {
				return fmt.Errorf("digest run: %w", err)
			}

			// Categorize inline after discovery so articles appear with categories
			catSvc := digestApp.NewCategorizeService(cheapLLM, contentRepo, contentRepo, id)
			if err := catSvc.Run(ctx); err != nil {
				slog.Warn("inline categorization failed", "error", err)
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
				SourceType:   lib.StrPtr("topic"),
				Title:        &title,
				BodyMarkdown: &result.Topic.OneLinePitch,
			}); err != nil {
				return fmt.Errorf("persisting topic: %w", err)
			}
			return nil
		},

		"compose_generate_draft": func(ctx context.Context, userID string, payload []byte) error {
			id, err := uuid.Parse(userID)
			if err != nil {
				return fmt.Errorf("invalid user id: %w", err)
			}
			var req struct {
				Theme   string `json:"theme"`
				Outline string `json:"outline"`
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
				Outline:           req.Outline,
			})
			if err != nil {
				return fmt.Errorf("draft generation: %w", err)
			}
			_ = result
			return nil
		},

		"compose_generate_outline": func(ctx context.Context, userID string, payload []byte) error {
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
			svc := composeApp.NewOutlineGeneratorService(llmClient, contentRepo, id)
			_, err = svc.Generate(ctx, composeApp.OutlineParams{Theme: req.Theme})
			if err != nil {
				return fmt.Errorf("outline generation: %w", err)
			}
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

		"generate_edition_intro": func(ctx context.Context, userID string, payload []byte) error {
			id, err := uuid.Parse(userID)
			if err != nil {
				return fmt.Errorf("invalid user id: %w", err)
			}
			var req struct {
				EditionID string `json:"edition_id"`
			}
			if err := json.Unmarshal(payload, &req); err != nil || req.EditionID == "" {
				return fmt.Errorf("invalid payload: edition_id required")
			}
			editionID, err := uuid.Parse(req.EditionID)
			if err != nil {
				return fmt.Errorf("invalid edition_id: %w", err)
			}

			edition, err := editionsRepo.GetByID(ctx, editionID)
			if err != nil {
				return fmt.Errorf("fetching edition: %w", err)
			}
			if edition.UserID != id {
				return fmt.Errorf("edition does not belong to user")
			}

			var tagSection string
			if len(edition.Tags) > 0 {
				tagSection = fmt.Sprintf("Relevant tags: %s\n", joinStrings(edition.Tags, ", "))
			}
			var categorySection string
			if edition.Category != nil {
				categorySection = fmt.Sprintf("Category: %s\n", *edition.Category)
			}

			resp, err := llmClient.Complete(ctx, coredomain.LLMRequest{
				SystemPrompt: "You are a newsletter writer. Generate a compelling introduction for a newsletter edition. Return only the introduction HTML, no markdown or extra commentary.",
				Messages: []coredomain.LLMMessage{
					{Role: "user", Content: fmt.Sprintf(
						"Title: %s\n%s%s\n\nGenerate a friendly, engaging introduction paragraph (2-3 sentences) for this newsletter edition.",
						edition.Title, categorySection, tagSection,
					)},
				},
				MaxTokens:   500,
				Temperature: 0.7,
			})
			if err != nil {
				return fmt.Errorf("LLM completion: %w", err)
			}

			if err := editionsRepo.UpdateBody(ctx, editionID, edition.Title, resp.Content); err != nil {
				return fmt.Errorf("persisting introduction: %w", err)
			}

			slog.Info("edition intro generated", "edition_id", editionID)
			return nil
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

func joinStrings(items []string, sep string) string {
	if len(items) == 0 {
		return ""
	}
	result := items[0]
	for _, s := range items[1:] {
		result += sep + s
	}
	return result
}
