package domain

import "context"

// LLMMessage represents a single message in a conversation.
type LLMMessage struct {
	Role    string // "user" | "assistant" | "system"
	Content string
}

// LLMRequest is the input to an LLM completion.
type LLMRequest struct {
	SystemPrompt string
	Messages     []LLMMessage
	MaxTokens    int
	Temperature  float64
}

// LLMResponse is the output from an LLM completion.
type LLMResponse struct {
	Content string
	Usage   LLMUsage
}

// LLMUsage contains token count information.
type LLMUsage struct {
	InputTokens  int
	OutputTokens int
}

// LLMClient abstracts over any LLM provider (OpenAI-compatible, Anthropic, etc.).
type LLMClient interface {
	Complete(ctx context.Context, req LLMRequest) (*LLMResponse, error)
}
