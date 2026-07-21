package application

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	coredomain "github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
	"github.com/rodrigo-militao/forge/internal/lib"
)

// TransformOptions describes a text transformation request.
type TransformOptions struct {
	Text   string
	Action string // "expand" or "rewrite"
}

// TransformService transforms text via LLM (expand, rewrite, etc.).
type TransformService struct {
	llm     ports.LLMClient
	content contentCreator
	userID  uuid.UUID
}

// NewTransformService creates a transform service.
func NewTransformService(llm ports.LLMClient, content contentCreator, userID uuid.UUID) *TransformService {
	return &TransformService{llm: llm, content: content, userID: userID}
}

// Run performs the transform and persists the result.
func (s *TransformService) Run(ctx context.Context, opts TransformOptions) error {
	actionPrompt := ""
	switch opts.Action {
	case "expand":
		actionPrompt = fmt.Sprintf("Expand the following text with more details, examples, and depth. Keep the same tone and style.\n\n%s", opts.Text)
	case "rewrite":
		actionPrompt = fmt.Sprintf("Rewrite the following text to be clearer and more engaging. Keep the same meaning but improve flow and readability.\n\n%s", opts.Text)
	default:
		return fmt.Errorf("unknown action: %s", opts.Action)
	}

	resp, err := s.llm.Complete(ctx, coredomain.LLMRequest{
		SystemPrompt: "You are a writing assistant. Respond only with the transformed text, no explanations.",
		Messages:     []coredomain.LLMMessage{{Role: "user", Content: actionPrompt}},
		MaxTokens:    2048,
		Temperature:  0.6,
	})
	if err != nil {
		return fmt.Errorf("LLM transform: %w", err)
	}

	title := fmt.Sprintf("AI %s suggestion", opts.Action)
	if err := s.content.Create(ctx, &coredomain.GeneratedContent{
		UserID:       s.userID,
		Product:      coredomain.ProductCompose,
		Status:       coredomain.ContentBuilding,
		SourceType:   lib.StrPtr(opts.Action),
		Title:        &title,
		BodyMarkdown: &resp.Content,
	}); err != nil {
		return fmt.Errorf("persisting transform result: %w", err)
	}
	return nil
}
