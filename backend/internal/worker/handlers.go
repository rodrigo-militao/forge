package worker

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rodrigo-militao/forge/internal/adapters/llm"
	"github.com/rodrigo-militao/forge/internal/adapters/postgres"
	composeApp "github.com/rodrigo-militao/forge/internal/compose/application"
	composeDomain "github.com/rodrigo-militao/forge/internal/compose/domain"
	coredomain "github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
	digestApp "github.com/rodrigo-militao/forge/internal/digest/application"
	digestDomain "github.com/rodrigo-militao/forge/internal/digest/domain"
	"github.com/rodrigo-militao/forge/internal/digest/adapters/rss"
	"github.com/rodrigo-militao/forge/internal/digest/adapters/search"
)

// NewHandlers creates the job handler functions and a map keyed by job type.
func NewHandlers(pool *pgxpool.Pool, llmAPIKey, llmBaseURL string) map[string]Handler {
	contentRepo := postgres.NewContentRepository(pool)
	topicsRepo := postgres.NewTopicRepository(pool)
	editionsRepo := postgres.NewEditionRepository(pool)

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

		"assemble_edition": func(ctx context.Context, userID string, payload []byte) error {
			svc := digestApp.NewEditionService(llmClient, contentRepo, editionsRepo)
			result, err := svc.Assemble(ctx, userID)
			if err != nil {
				return fmt.Errorf("edition assembly: %w", err)
			}
			_ = result
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

			// Select voice for the topic
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
				Action string `json:"action"` // "expand" | "rewrite"
			}
			if err := json.Unmarshal(payload, &req); err != nil || req.Text == "" {
				return fmt.Errorf("invalid payload: text required")
			}

			actionPrompt := ""
			switch req.Action {
			case "expand":
				actionPrompt = fmt.Sprintf(
					"Expand the following text with more details, examples, and depth. Keep the same tone and style.\n\n%s", req.Text)
			case "rewrite":
				actionPrompt = fmt.Sprintf(
					"Rewrite the following text to be clearer and more engaging. Keep the same meaning but improve flow and readability.\n\n%s", req.Text)
			default:
				return fmt.Errorf("unknown action: %s", req.Action)
			}

			resp, err := llmClient.Complete(ctx, ports.LLMRequest{
				SystemPrompt: "You are a writing assistant. Respond only with the transformed text, no explanations.",
				Messages:     []ports.LLMMessage{{Role: "user", Content: actionPrompt}},
				MaxTokens:    2048,
				Temperature:  0.6,
			})
			if err != nil {
				return fmt.Errorf("LLM transform: %w", err)
			}

			// Store result in generated_content so frontend can poll and retrieve it
			title := fmt.Sprintf("AI %s suggestion", req.Action)
			if err := contentRepo.Create(ctx, &coredomain.GeneratedContent{
				UserID:       uuid.MustParse(userID),
				Product:      coredomain.ProductCompose,
				Status:       coredomain.ContentDraft,
				SourceType:   strPtr(req.Action),
				Title:        &title,
				BodyMarkdown: &resp.Content,
			}); err != nil {
				return fmt.Errorf("persisting transform result: %w", err)
			}

			return nil
		},
	}
}
