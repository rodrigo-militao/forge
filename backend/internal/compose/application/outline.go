package application

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	coredomain "github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
	"github.com/rodrigo-militao/forge/internal/lib"
)

// OutlineGeneratorService generates article outlines via LLM.
type OutlineGeneratorService struct {
	llm     ports.LLMClient
	content contentCreator
	userID  uuid.UUID
}

// NewOutlineGeneratorService creates an outline generator service.
func NewOutlineGeneratorService(llm ports.LLMClient, content contentCreator, userID uuid.UUID) *OutlineGeneratorService {
	return &OutlineGeneratorService{
		llm:     llm,
		content: content,
		userID:  userID,
	}
}

// OutlineParams is the input to outline generation.
type OutlineParams struct {
	Theme string
}

// OutlineResult is the output of outline generation.
type OutlineResult struct {
	Outline   string
	ContentID uuid.UUID
}

// Generate calls the LLM to write an article outline and persists it.
func (s *OutlineGeneratorService) Generate(ctx context.Context, params OutlineParams) (*OutlineResult, error) {
	systemPrompt := BuildOutlineSystemPrompt()
	resp, err := s.llm.Complete(ctx, coredomain.LLMRequest{
		SystemPrompt: systemPrompt,
		Messages:     []coredomain.LLMMessage{{Role: "user", Content: fmt.Sprintf("Generate an outline for an article about: %s", params.Theme)}},
		MaxTokens:    1024,
		Temperature:  0.7,
	})
	if err != nil {
		return nil, fmt.Errorf("LLM outline generation: %w", err)
	}

	outline, err := ParseOutlineResponse(resp.Content)
	if err != nil {
		return nil, fmt.Errorf("parsing outline: %w", err)
	}

	contentID := uuid.New()
	title := fmt.Sprintf("Outline: %s", params.Theme)
	if err := s.content.Create(ctx, &coredomain.GeneratedContent{
		ID:          contentID,
		UserID:      s.userID,
		Product:     coredomain.ProductCompose,
		Status:      coredomain.ContentBuilding,
		SourceType:  lib.StrPtr("topic"),
		Title:       &title,
		Outline:     &outline,
	}); err != nil {
		return nil, fmt.Errorf("persisting outline: %w", err)
	}

	return &OutlineResult{
		Outline:   outline,
		ContentID: contentID,
	}, nil
}
