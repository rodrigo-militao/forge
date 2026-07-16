package llm

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/rodrigo-militao/forge/internal/core/domain"
)

func TestClient_Complete_ok(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer test-key" {
			t.Error("missing or wrong Authorization header")
		}
		resp := chatResponse{
			Choices: []choice{{Message: chatMessage{Role: "assistant", Content: "Hello!"}}},
			Usage:   usage{PromptTokens: 10, CompletionTokens: 5},
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer srv.Close()

	c := NewClient("test-key", srv.URL, WithHTTPClient(srv.Client()))
	resp, err := c.Complete(context.Background(), domain.LLMRequest{
		SystemPrompt: "Be helpful",
		Messages:     []domain.LLMMessage{{Role: "user", Content: "Hi"}},
	})
	if err != nil {
		t.Fatalf("Complete: %v", err)
	}
	if resp.Content != "Hello!" {
		t.Errorf("expected 'Hello!', got %q", resp.Content)
	}
	if resp.Usage.InputTokens != 10 || resp.Usage.OutputTokens != 5 {
		t.Errorf("unexpected usage: %+v", resp.Usage)
	}
}

func TestClient_Complete_rateLimit(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
		json.NewEncoder(w).Encode(apiErr{Message: "rate limited"})
	}))
	defer srv.Close()

	c := NewClient("test-key", srv.URL, WithHTTPClient(srv.Client()))
	_, err := c.Complete(context.Background(), domain.LLMRequest{
		SystemPrompt: "test",
	})
	if err == nil {
		t.Fatal("expected error for 429")
	}
}

func TestClient_Complete_serverError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer srv.Close()

	c := NewClient("test-key", srv.URL, WithHTTPClient(srv.Client()))
	_, err := c.Complete(context.Background(), domain.LLMRequest{
		SystemPrompt: "test",
	})
	// 503 is retriable — after maxRetries it returns an error
	if err == nil {
		t.Fatal("expected error after retries exhausted")
	}
}

func TestClient_Complete_badRequest(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(apiErr{Message: "bad request"})
	}))
	defer srv.Close()

	c := NewClient("test-key", srv.URL, WithHTTPClient(srv.Client()))
	_, err := c.Complete(context.Background(), domain.LLMRequest{
		SystemPrompt: "test",
	})
	// Bad request (4xx that is not 429) is NOT retriable
	if err == nil {
		t.Fatal("expected error for 400")
	}
}

func TestClient_Complete_emptyChoices(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := chatResponse{Choices: []choice{}, Usage: usage{}}
		json.NewEncoder(w).Encode(resp)
	}))
	defer srv.Close()

	c := NewClient("test-key", srv.URL, WithHTTPClient(srv.Client()))
	_, err := c.Complete(context.Background(), domain.LLMRequest{
		SystemPrompt: "test",
	})
	if err == nil {
		t.Fatal("expected error for empty choices")
	}
}

func TestNewLoggingWrapper(t *testing.T) {
	inner := &stubClient{content: "stub response"}
	wrapped := NewLoggingWrapper(inner)
	resp, err := wrapped.Complete(context.Background(), domain.LLMRequest{
		SystemPrompt: "test",
	})
	if err != nil {
		t.Fatalf("Complete: %v", err)
	}
	if resp.Content != "stub response" {
		t.Errorf("expected 'stub response', got %q", resp.Content)
	}
}

func TestClient_newDefaults(t *testing.T) {
	c := NewClient("sk-test", "https://test.example.com")
	if c.apiKey != "sk-test" {
		t.Errorf("expected apiKey sk-test, got %s", c.apiKey)
	}
	if c.baseURL != "https://test.example.com" {
		t.Errorf("expected baseURL https://test.example.com, got %s", c.baseURL)
	}
	if c.model != defaultModel {
		t.Errorf("expected model %s, got %s", defaultModel, c.model)
	}
	if c.maxTokens != defaultMaxTokens {
		t.Errorf("expected maxTokens %d, got %d", defaultMaxTokens, c.maxTokens)
	}
	if c.httpClient.Timeout != 120*time.Second {
		t.Errorf("expected timeout 120s, got %v", c.httpClient.Timeout)
	}
}

func TestClient_options(t *testing.T) {
	custom := &http.Client{Timeout: 5 * time.Second}
	c := NewClient("sk-test", "https://test.example.com",
		WithModel("gpt-4"),
		WithMaxTokens(2048),
		WithHTTPClient(custom),
	)
	if c.model != "gpt-4" {
		t.Errorf("expected model gpt-4, got %s", c.model)
	}
	if c.maxTokens != 2048 {
		t.Errorf("expected maxTokens 2048, got %d", c.maxTokens)
	}
	if c.httpClient != custom {
		t.Error("expected custom http client")
	}
}

func TestBuildRequest(t *testing.T) {
	c := NewClient("sk-test", "https://test.example.com", WithModel("gpt-4"), WithMaxTokens(1024))
	req := c.buildRequest(domain.LLMRequest{
		SystemPrompt: "You are a helpful assistant.",
		Messages: []domain.LLMMessage{
			{Role: "user", Content: "Hello"},
			{Role: "assistant", Content: "Hi there"},
		},
		Temperature: 0.7,
	})
	if req.Model != "gpt-4" {
		t.Errorf("expected model gpt-4, got %s", req.Model)
	}
	if req.MaxTokens != 1024 {
		t.Errorf("expected maxTokens 1024, got %d", req.MaxTokens)
	}
	if req.Temperature != 0.7 {
		t.Errorf("expected temperature 0.7, got %f", req.Temperature)
	}
	if len(req.Messages) != 3 {
		t.Fatalf("expected 3 messages, got %d", len(req.Messages))
	}
	if req.Messages[0].Role != "system" || req.Messages[0].Content != "You are a helpful assistant." {
		t.Errorf("expected system message first, got %s: %s", req.Messages[0].Role, req.Messages[0].Content)
	}
	if req.Messages[1].Role != "user" || req.Messages[1].Content != "Hello" {
		t.Errorf("expected user message, got %s: %s", req.Messages[1].Role, req.Messages[1].Content)
	}
}

func TestBuildRequest_noSystem(t *testing.T) {
	c := NewClient("sk-test", "https://test.example.com")
	req := c.buildRequest(domain.LLMRequest{
		Messages: []domain.LLMMessage{
			{Role: "user", Content: "Hello"},
		},
	})
	if len(req.Messages) != 1 {
		t.Fatalf("expected 1 message, got %d", len(req.Messages))
	}
	if req.Messages[0].Role != "user" {
		t.Errorf("expected role user, got %s", req.Messages[0].Role)
	}
}

func TestClient_Complete_invalidJSONResponse(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{invalid json`))
	}))
	defer srv.Close()

	c := NewClient("test-key", srv.URL, WithHTTPClient(srv.Client()))
	_, err := c.Complete(context.Background(), domain.LLMRequest{SystemPrompt: "test"})
	if err == nil {
		t.Fatal("expected error for invalid JSON")
	}
}

func TestClient_Complete_apiErrorInBody(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		resp := chatResponse{Error: &apiErr{Message: "insufficient_quota"}}
		json.NewEncoder(w).Encode(resp)
	}))
	defer srv.Close()

	c := NewClient("test-key", srv.URL, WithHTTPClient(srv.Client()))
	_, err := c.Complete(context.Background(), domain.LLMRequest{SystemPrompt: "test"})
	if err == nil {
		t.Fatal("expected error for API error in body")
	}
}

func TestClient_Complete_contextCancelled(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(5 * time.Second)
	}))
	defer srv.Close()

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	c := NewClient("test-key", srv.URL, WithHTTPClient(srv.Client()))
	_, err := c.Complete(ctx, domain.LLMRequest{SystemPrompt: "test"})
	if err == nil {
		t.Fatal("expected error for cancelled context")
	}
}

func TestClient_Complete_contextTimeout(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(500 * time.Millisecond)
	}))
	defer srv.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancel()

	c := NewClient("test-key", srv.URL, WithHTTPClient(srv.Client()))
	_, err := c.Complete(ctx, domain.LLMRequest{SystemPrompt: "test"})
	if err == nil {
		t.Fatal("expected error for timeout")
	}
}

func TestClient_Complete_httpRequestError(t *testing.T) {
	c := NewClient("test-key", "http://127.0.0.1:1", WithHTTPClient(&http.Client{Timeout: 1 * time.Millisecond}))
	_, err := c.Complete(context.Background(), domain.LLMRequest{SystemPrompt: "test"})
	if err == nil {
		t.Fatal("expected error for connection refused")
	}
}

func TestParseAPIError_withJSON(t *testing.T) {
	err := parseAPIError(400, []byte(`{"message": "bad request"}`))
	var ae *apiError
	if !asApiError(err, &ae) {
		t.Fatalf("expected apiError, got %T", err)
	}
	if ae.Message != "bad request" {
		t.Errorf("expected 'bad request', got %s", ae.Message)
	}
	if ae.StatusCode != 400 {
		t.Errorf("expected status 400, got %d", ae.StatusCode)
	}
}

func TestParseAPIError_plainText(t *testing.T) {
	err := parseAPIError(500, []byte(`Internal Server Error`))
	var ae *apiError
	if !asApiError(err, &ae) {
		t.Fatalf("expected apiError, got %T", err)
	}
	if ae.Message != "Internal Server Error" {
		t.Errorf("expected 'Internal Server Error', got %s", ae.Message)
	}
}

func TestParseAPIError_emptyBody(t *testing.T) {
	err := parseAPIError(429, []byte(``))
	var ae *apiError
	if !asApiError(err, &ae) {
		t.Fatalf("expected apiError, got %T", err)
	}
	if ae.Message != "" {
		t.Errorf("expected empty message, got %s", ae.Message)
	}
}

func TestApiError_Error(t *testing.T) {
	e := &apiError{StatusCode: 429, Message: "too many requests"}
	msg := e.Error()
	if msg != "API error (HTTP 429): too many requests" {
		t.Errorf("unexpected error message: %s", msg)
	}
}

func TestApiError_Retriable(t *testing.T) {
	tests := []struct {
		status   int
		expected bool
	}{
		{400, false}, {401, false}, {403, false}, {404, false},
		{429, true}, {500, true}, {502, true}, {503, true},
	}
	for _, tt := range tests {
		e := &apiError{StatusCode: tt.status}
		if got := e.Retriable(); got != tt.expected {
			t.Errorf("status %d: expected retriable=%v, got %v", tt.status, tt.expected, got)
		}
	}
}

// asApiError unwraps errors to find *apiError, which may be nested by retry wrapping.
func asApiError(err error, target **apiError) bool {
	for e := err; e != nil; e = errors.Unwrap(e) {
		var ok bool
		*target, ok = e.(*apiError)
		if ok {
			return true
		}
	}
	return false
}

// --- helpers ---

type stubClient struct {
	content string
	err     error
}

func (s *stubClient) Complete(ctx context.Context, req domain.LLMRequest) (*domain.LLMResponse, error) {
	if s.err != nil {
		return nil, s.err
	}
	return &domain.LLMResponse{Content: s.content}, nil
}
