// Package application orchestrates Compose use cases.
package application

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/compose/domain"
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

	systemPrompt := buildTopicSystemPrompt(history)
	resp, err := s.llm.Complete(ctx, ports.LLMRequest{
		SystemPrompt: systemPrompt,
		Messages:     []ports.LLMMessage{{Role: "user", Content: "Generate one article topic for today. Follow all the rules above strictly."}},
		MaxTokens:    1024,
		Temperature:  0.8,
	})
	if err != nil {
		return nil, fmt.Errorf("LLM topic generation: %w", err)
	}

	topic, err := parseTopicJSON(resp.Content)
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

// --- prompt building ---

func buildTopicSystemPrompt(history []domain.HistoryEntry) string {
	var avoidList string
	if len(history) == 0 {
		avoidList = "(none yet)"
	} else {
		var b strings.Builder
		for i, e := range history {
			if i > 0 {
				b.WriteString("\n")
			}
			b.WriteString(fmt.Sprintf("- %s [%s / %s]", e.Topic.Topic, e.Topic.ThemeArea, e.Topic.Format))
		}
		avoidList = b.String()
	}

	return fmt.Sprintf(`You are the Topic Generator for a technical publication focused on:
- Deep backend/infrastructure engineering (Go, databases, distributed systems)
- AI (practical, technical angle — not hype/news)
- Personal development for engineers
- Content creation for the internet (writing, audience-building, technical blogging)

Your job: propose ONE article topic per run, tailored for a technically sophisticated
audience of software engineers.

Rules:
- Do not repeat or closely overlap any topic in the AVOID LIST below.
- Prefer specific, narrow angles over broad ones. Bad: "How databases work."
  Good: "Why B-Trees still beat LSM-Trees for read-heavy workloads in 2026."
- Rotate across the four theme areas above over time.
- Each topic must be answerable in 1200-2000 words without becoming shallow.
- Classify the topic's format, since this determines which writing voice will be used:
  - "tutorial": a how-to, step-by-step, or walkthrough.
  - "deep_dive": explains a technical mechanism in depth (only valid for backend_infra or ai themes).
  - "framework": distills a practice, principle, or opinion into a structured list.
  - "essay": a reflective, first-principles piece (only valid for personal_dev or content_creation themes).

AVOID LIST (previously published or already queued):
%s

Output strictly as JSON:
{
  "topic": "string",
  "theme_area": "backend_infra | ai | personal_dev | content_creation",
  "format": "tutorial | deep_dive | framework | essay",
  "one_line_pitch": "why this angle is interesting, in one sentence",
  "target_length_words": integer
}`, avoidList)
}

// --- JSON parsing ---

type topicJSON struct {
	Topic             string `json:"topic"`
	ThemeArea         string `json:"theme_area"`
	Format            string `json:"format"`
	OneLinePitch      string `json:"one_line_pitch"`
	TargetLengthWords int    `json:"target_length_words"`
}

func parseTopicJSON(raw string) (*domain.Topic, error) {
	var tj topicJSON
	if err := json.Unmarshal([]byte(raw), &tj); err == nil && tj.Topic != "" {
		return mapTopic(tj)
	}
	start := strings.Index(raw, "{")
	end := strings.LastIndex(raw, "}")
	if start >= 0 && end > start {
		if err := json.Unmarshal([]byte(raw[start:end+1]), &tj); err == nil && tj.Topic != "" {
			return mapTopic(tj)
		}
	}
	return nil, fmt.Errorf("could not parse topic JSON from model output")
}

func mapTopic(tj topicJSON) (*domain.Topic, error) {
	if tj.TargetLengthWords <= 0 {
		tj.TargetLengthWords = 1500
	}
	return &domain.Topic{
		Topic:             tj.Topic,
		ThemeArea:         domain.ThemeArea(tj.ThemeArea),
		Format:            domain.Format(tj.Format),
		OneLinePitch:      tj.OneLinePitch,
		TargetLengthWords: tj.TargetLengthWords,
	}, nil
}

// Compile-time check: validate JSON tag mapping.
var _ = topicJSON{}
