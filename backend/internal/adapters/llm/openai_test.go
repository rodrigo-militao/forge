package llm

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

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
