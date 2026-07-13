package domain

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

