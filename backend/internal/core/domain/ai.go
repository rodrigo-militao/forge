package domain

import (
	"time"

	"github.com/google/uuid"
)

// AIAnalysisResult contains the structured output of an article analysis.
type AIAnalysisResult struct {
	Summary           string   `json:"summary"`
	Strengths         []string `json:"strengths"`
	Improvements      []string `json:"improvements"`
	MissingReferences []string `json:"missing_references"`
	Score             int      `json:"score"`
}

// AIAnalysis is a persisted AI analysis of an article.
type AIAnalysis struct {
	ID           uuid.UUID `json:"id"`
	UserID       uuid.UUID `json:"user_id"`
	ContentID    uuid.UUID `json:"content_id"`
	Summary      string    `json:"summary"`
	Strengths    []string  `json:"strengths"`
	Improvements []string  `json:"improvements"`
	Score        int       `json:"score"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// AITextSuggestion contains an improvement suggestion for selected text.
type AITextSuggestion struct {
	Original     string `json:"original"`
	Suggestion   string `json:"suggestion"`
	Explanation  string `json:"explanation"`
}

// AIReferenceContext holds reference data sent to the AI provider.
type AIReferenceContext struct {
	Title       string `json:"title"`
	URL         string `json:"url"`
	Description string `json:"description"`
	Type        string `json:"type"`
}

const (
	// MaxImproveTextLength is the maximum number of characters for text improvement.
	MaxImproveTextLength = 5000
	// MaxAnalyzeBodyLength is the maximum body length sent for analysis.
	MaxAnalyzeBodyLength = 50000
)
