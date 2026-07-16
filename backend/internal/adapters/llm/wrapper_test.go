package llm

import (
	"context"
	"errors"
	"testing"

	"github.com/rodrigo-militao/forge/internal/core/domain"
)

func TestLoggingWrapper_success(t *testing.T) {
	inner := &stubClient{content: "hello world"}
	w := NewLoggingWrapper(inner)

	resp, err := w.Complete(context.Background(), domain.LLMRequest{
		Messages: []domain.LLMMessage{{Role: "user", Content: "Hi"}},
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if resp.Content != "hello world" {
		t.Errorf("expected 'hello world', got %q", resp.Content)
	}
}

func TestLoggingWrapper_error(t *testing.T) {
	inner := &stubClient{err: errors.New("api failure")}
	w := NewLoggingWrapper(inner)

	_, err := w.Complete(context.Background(), domain.LLMRequest{
		Messages: []domain.LLMMessage{{Role: "user", Content: "Hi"}},
	})
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	// The wrapper wraps the error with "llm: " prefix
	if err.Error() != "llm: api failure" {
		t.Errorf("expected 'llm: api failure', got %q", err.Error())
	}
}

func TestLoggingWrapper_nilResponse(t *testing.T) {
	// When inner returns (nil, err), wrapper should still wrap the error
	inner := &stubClient{err: errors.New("something went wrong")}
	w := NewLoggingWrapper(inner)

	resp, err := w.Complete(context.Background(), domain.LLMRequest{
		Messages: []domain.LLMMessage{{Role: "user", Content: "Hi"}},
	})
	if resp != nil {
		t.Error("expected nil response on error")
	}
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestLoggingWrapper_implementsInterface(t *testing.T) {
	var _ interface {
		Complete(context.Context, domain.LLMRequest) (*domain.LLMResponse, error)
	} = NewLoggingWrapper(&stubClient{})
}
