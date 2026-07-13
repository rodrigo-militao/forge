// Package application orchestrates Compose use cases.
package application

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/compose/domain"
	coredomain "github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// TopicGeneratorService generates article topics via LLM, avoiding repetition.
type TopicGeneratorService struct {
	llm    ports.LLMClient
	topics domain.TopicRepository
	userID uuid.UUID
}

// NewTopicGeneratorService creates a topic generator.
func NewTopicGeneratorService(llm ports.LLMClient, topics domain.TopicRepository, userID uuid.UUID) *TopicGeneratorService {
	return &TopicGeneratorService{
		llm:    llm,
		topics: topics,
		userID: userID,
	}
}

// GenerateResult is the output of a topic generation.
type GenerateResult struct {
	Topic domain.Topic
}

// Generate calls the LLM to produce a new topic, avoiding history overlap.
func (s *TopicGeneratorService) Generate(ctx context.Context) (*GenerateResult, error) {
	history, err := s.topics.History(ctx, s.userID, 20)
	if err != nil {
		return nil, fmt.Errorf("loading topic history: %w", err)
	}

	systemPrompt := BuildTopicSystemPrompt(history)
	resp, err := s.llm.Complete(ctx, coredomain.LLMRequest{
		SystemPrompt: systemPrompt,
		Messages:     []coredomain.LLMMessage{{Role: "user", Content: "Generate one article topic for today. Follow all the rules above strictly."}},
		MaxTokens:    1024,
		Temperature:  0.8,
	})
	if err != nil {
		return nil, fmt.Errorf("LLM topic generation: %w", err)
	}

	topic, err := ParseTopicJSON(resp.Content)
	if err != nil {
		return nil, fmt.Errorf("parsing topic: %w", err)
	}
	topic.UserID = s.userID
	topic.CreatedAt = time.Now()
	topic.UpdatedAt = time.Now()

	if err := s.topics.Create(ctx, topic); err != nil {
		return nil, fmt.Errorf("persisting topic: %w", err)
	}

	return &GenerateResult{Topic: *topic}, nil
}

