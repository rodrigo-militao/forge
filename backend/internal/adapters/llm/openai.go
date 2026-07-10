// Package llm implements ports.LLMClient for OpenAI-compatible Chat Completions API.
package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"golang.org/x/time/rate"

	"github.com/rodrigo-militao/forge/internal/core/ports"
	"github.com/rodrigo-militao/forge/internal/lib"
)

const (
	defaultBaseURL    = "https://code.verboo.ai/router/v1"
	defaultModel      = "pro/deepseek-v4-flash"
	defaultMaxTokens  = 4096
	maxRetries        = 3
	rateLimitRequests = 4
)

// Client implements ports.LLMClient for OpenAI-compatible APIs.
type Client struct {
	apiKey     string
	baseURL    string
	model      string
	maxTokens  int
	limiter    *rate.Limiter
	httpClient *http.Client
}

// Option configures the LLM client.
type Option func(*Client)

// NewClient creates an OpenAI-compatible LLM client.
// baseURL should include the path prefix, e.g. "https://code.verboo.ai/router/v1".
func NewClient(apiKey, baseURL string, opts ...Option) *Client {
	c := &Client{
		apiKey:     apiKey,
		baseURL:    baseURL,
		model:      defaultModel,
		maxTokens:  defaultMaxTokens,
		limiter:    rate.NewLimiter(rate.Limit(rateLimitRequests), 1),
		httpClient: &http.Client{Timeout: 120 * time.Second},
	}
	for _, opt := range opts {
		opt(c)
	}
	return c
}

// WithModel sets a custom model name.
func WithModel(model string) Option {
	return func(c *Client) {
		c.model = model
	}
}

// WithMaxTokens sets a custom max tokens limit.
func WithMaxTokens(maxTokens int) Option {
	return func(c *Client) {
		c.maxTokens = maxTokens
	}
}

// WithHTTPClient sets a custom HTTP client (useful for testing).
func WithHTTPClient(hc *http.Client) Option {
	return func(c *Client) {
		c.httpClient = hc
	}
}

// Complete sends a chat completion request and returns the response.
func (c *Client) Complete(ctx context.Context, req ports.LLMRequest) (*ports.LLMResponse, error) {
	if err := c.limiter.Wait(ctx); err != nil {
		return nil, fmt.Errorf("rate limit wait: %w", err)
	}

	apiReq := c.buildRequest(req)
	return lib.Do(ctx, maxRetries, func() (*ports.LLMResponse, error) {
		return c.doRequest(ctx, apiReq)
	})
}

// --- internal types ---

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type chatRequest struct {
	Model       string        `json:"model"`
	Messages    []chatMessage `json:"messages"`
	MaxTokens   int           `json:"max_tokens,omitempty"`
	Temperature float64       `json:"temperature,omitempty"`
}

type chatResponse struct {
	Choices []choice `json:"choices"`
	Usage   usage    `json:"usage"`
	Error   *apiErr  `json:"error,omitempty"`
}

type choice struct {
	Message chatMessage `json:"message"`
}

type usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
}

type apiErr struct {
	Message string `json:"message"`
}

// --- request / response ---

func (c *Client) buildRequest(req ports.LLMRequest) chatRequest {
	messages := []chatMessage{}
	if req.SystemPrompt != "" {
		messages = append(messages, chatMessage{Role: "system", Content: req.SystemPrompt})
	}
	for _, m := range req.Messages {
		messages = append(messages, chatMessage{Role: m.Role, Content: m.Content})
	}
	return chatRequest{
		Model:       c.model,
		Messages:    messages,
		MaxTokens:   c.maxTokens,
		Temperature: req.Temperature,
	}
}

func (c *Client) doRequest(ctx context.Context, req chatRequest) (*ports.LLMResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	url := c.baseURL + "/chat/completions"
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return nil, parseAPIError(resp.StatusCode, respBody)
	}

	var apiResp chatResponse
	if err := json.Unmarshal(respBody, &apiResp); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}
	if apiResp.Error != nil && apiResp.Error.Message != "" {
		return nil, fmt.Errorf("API error: %s", apiResp.Error.Message)
	}
	if len(apiResp.Choices) == 0 {
		return nil, fmt.Errorf("no choices in response")
	}

	r := &ports.LLMResponse{
		Content: apiResp.Choices[0].Message.Content,
		Usage: ports.LLMUsage{
			InputTokens:  apiResp.Usage.PromptTokens,
			OutputTokens: apiResp.Usage.CompletionTokens,
		},
	}

	lib.LogAttrs(ctx, slog.LevelInfo, "llm request completed",
		slog.String("model", c.model),
		slog.Int("input_tokens", r.Usage.InputTokens),
		slog.Int("output_tokens", r.Usage.OutputTokens),
	)
	return r, nil
}

func parseAPIError(statusCode int, body []byte) error {
	var e apiErr
	if json.Unmarshal(body, &e) == nil && e.Message != "" {
		return fmt.Errorf("API error (HTTP %d): %s", statusCode, e.Message)
	}
	return fmt.Errorf("API error (HTTP %d): %s", statusCode, string(body))
}

// Compile-time interface check.
var _ ports.LLMClient = (*Client)(nil)
