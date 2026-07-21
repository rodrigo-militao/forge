package application

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// AIService provides AI-powered editorial assistance (Sprint 4-5).
// It uses the existing LLMClient port and never modifies article content automatically.
type AIService struct {
	llm      ports.LLMClient
	content  ports.ContentRepository
	refs     ports.ReferenceRepository
	analysis ports.AIAnalysisRepository
}

func NewAIService(llm ports.LLMClient, content ports.ContentRepository, refs ports.ReferenceRepository, analysis ports.AIAnalysisRepository) *AIService {
	return &AIService{llm: llm, content: content, refs: refs, analysis: analysis}
}

// AnalyzeArticle runs an AI analysis on the user's article, including reference context.
// It persists the result and never modifies the article.
func (s *AIService) AnalyzeArticle(ctx context.Context, contentID, userID uuid.UUID) (*domain.AIAnalysis, error) {
	article, err := domain.RequireOwnership(ctx, func(ctx context.Context) (*domain.GeneratedContent, error) {
		return s.content.GetByID(ctx, contentID)
	}, userID)
	if err != nil {
		return nil, err
	}

	body := ""
	if article.BodyMarkdown != nil {
		body = *article.BodyMarkdown
	}
	if len(body) > domain.MaxAnalyzeBodyLength {
		body = body[:domain.MaxAnalyzeBodyLength]
	}
	title := ""
	if article.Title != nil {
		title = *article.Title
	}

	refs, err := s.refs.ListByContent(ctx, contentID)
	if err != nil {
		return nil, fmt.Errorf("list references: %w", err)
	}

	systemPrompt := `You are an expert editorial assistant. Analyze the article below and return a JSON object with exactly these fields:

{
  "summary": "A one-paragraph summary of the article",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "score": 75
}

Score must be an integer between 0 and 100. Be honest and constructive.`

	var refContext strings.Builder
	if len(refs) > 0 {
		refContext.WriteString("\n\nAttached references:\n")
		for _, r := range refs {
			t := ""
			if r.Title != nil {
				t = *r.Title
			}
			d := ""
			if r.Description != nil {
				d = *r.Description
			}
			refContext.WriteString(fmt.Sprintf("- %s (%s): %s\n", t, r.URL, d))
		}
	}

	userContent := fmt.Sprintf("Title: %s\n\nBody:\n%s\n%s", title, body, refContext.String())

	resp, err := s.llm.Complete(ctx, domain.LLMRequest{
		SystemPrompt: systemPrompt,
		Messages:     []domain.LLMMessage{{Role: "user", Content: userContent}},
		Temperature:  0.3,
	})
	if err != nil {
		return nil, fmt.Errorf("llm analyze: %w", err)
	}

	var result domain.AIAnalysisResult
	if err := json.Unmarshal([]byte(resp.Content), &result); err != nil {
		content := resp.Content
		if start := strings.Index(content, "{"); start >= 0 {
			if end := strings.LastIndex(content, "}"); end > start {
				content = content[start : end+1]
			}
		}
		if err2 := json.Unmarshal([]byte(content), &result); err2 != nil {
			return nil, fmt.Errorf("parse analysis result: %w", err2)
		}
	}

	// Persist the analysis
	analysis := &domain.AIAnalysis{
		UserID:       userID,
		ContentID:    contentID,
		Summary:      result.Summary,
		Strengths:    result.Strengths,
		Improvements: result.Improvements,
		Score:        result.Score,
	}
	if err := s.analysis.Create(ctx, analysis); err != nil {
		return nil, fmt.Errorf("persist analysis: %w", err)
	}
	return analysis, nil
}

// GetLatestAnalysis returns the most recent analysis for the user's content.
func (s *AIService) GetLatestAnalysis(ctx context.Context, contentID, userID uuid.UUID) (*domain.AIAnalysis, error) {
	return s.analysis.GetLatestByContentID(ctx, contentID, userID)
}

// ImproveText suggests an improvement for a selected piece of text.
// It never modifies the article automatically.
func (s *AIService) ImproveText(ctx context.Context, contentID, userID uuid.UUID, text, instruction, contextBefore, contextAfter string) (*domain.AITextSuggestion, error) {
	text = strings.TrimSpace(text)
	if text == "" {
		return nil, fmt.Errorf("%w: text is required", domain.ErrInvalidInput)
	}
	if len(text) > domain.MaxImproveTextLength {
		return nil, fmt.Errorf("%w: text exceeds %d characters", domain.ErrInvalidInput, domain.MaxImproveTextLength)
	}
	if strings.TrimSpace(instruction) == "" {
		return nil, fmt.Errorf("%w: instruction is required", domain.ErrInvalidInput)
	}

	if _, err := domain.RequireOwnership(ctx, func(ctx context.Context) (*domain.GeneratedContent, error) {
		return s.content.GetByID(ctx, contentID)
	}, userID); err != nil {
		return nil, err
	}

	systemPrompt := `You are an expert editorial assistant. Improve the given text according to the instruction. Return a JSON object with exactly these fields:

{
  "original": "the original text",
  "suggestion": "the improved text",
  "explanation": "brief explanation of what changed and why"
}

Only return the JSON, no other text.`

	userContent := fmt.Sprintf("Instruction: %s\n\nText:\n%s", instruction, text)
	if contextBefore != "" || contextAfter != "" {
		userContent = fmt.Sprintf("%s\n\nSurrounding context (for reference only):\nBefore:\n%s\n\nAfter:\n%s", userContent, contextBefore, contextAfter)
	}

	resp, err := s.llm.Complete(ctx, domain.LLMRequest{
		SystemPrompt: systemPrompt,
		Messages:     []domain.LLMMessage{{Role: "user", Content: userContent}},
		Temperature:  0.5,
	})
	if err != nil {
		return nil, fmt.Errorf("llm improve: %w", err)
	}

	content := resp.Content
	if start := strings.Index(content, "{"); start >= 0 {
		if end := strings.LastIndex(content, "}"); end > start {
			content = content[start : end+1]
		}
	}

	var result domain.AITextSuggestion
	if err := json.Unmarshal([]byte(content), &result); err != nil {
		return nil, fmt.Errorf("parse improvement: %w", err)
	}
	return &result, nil
}
