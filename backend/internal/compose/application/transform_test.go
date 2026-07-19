package application

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"

	"github.com/google/uuid"
	coredomain "github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// mockLLMClient simulates an LLM for testing.
type mockLLMClient struct {
	mu         sync.Mutex
	response   *coredomain.LLMResponse
	err        error
	lastPrompt string
}

func (m *mockLLMClient) Complete(_ context.Context, req coredomain.LLMRequest) (*coredomain.LLMResponse, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.lastPrompt = req.Messages[0].Content
	return m.response, m.err
}

// mockContentWriter records created content for verification.
type mockContentWriter struct {
	mu      sync.Mutex
	created []*coredomain.GeneratedContent
}

func (m *mockContentWriter) Create(_ context.Context, content *coredomain.GeneratedContent) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.created = append(m.created, content)
	return nil
}

func (m *mockContentWriter) UpdateBody(_ context.Context, _ uuid.UUID, _, _ *string) error { return nil }
func (m *mockContentWriter) UpdateOutline(_ context.Context, _ uuid.UUID, _ *string) error { return nil }
func (m *mockContentWriter) UpdateStatus(_ context.Context, _ uuid.UUID, _ coredomain.ContentStatus) error {
	return nil
}
func (m *mockContentWriter) UpdateStatusWithPublishedAt(_ context.Context, _ uuid.UUID, _ coredomain.ContentStatus) error {
	return nil
}
func (m *mockContentWriter) SoftDelete(_ context.Context, _ uuid.UUID) error { return nil }

func TestTransformService_Run_expand(t *testing.T) {
	llm := &mockLLMClient{
		response: &coredomain.LLMResponse{
			Content: "Expanded version of the text with more details and depth.",
		},
	}
	writer := &mockContentWriter{}
	svc := NewTransformService(llm, writer, uuid.New())

	err := svc.Run(context.Background(), TransformOptions{
		Text:   "Original short text.",
		Action: "expand",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(llm.lastPrompt, "Expand") {
		t.Error("expected expand prompt to contain 'Expand'")
	}
	if !strings.Contains(llm.lastPrompt, "Original short text.") {
		t.Error("expected expand prompt to include the original text")
	}

	if len(writer.created) != 1 {
		t.Fatalf("expected 1 created content, got %d", len(writer.created))
	}
	if writer.created[0].Title == nil || *writer.created[0].Title != "AI expand suggestion" {
		t.Errorf("expected title 'AI expand suggestion', got '%v'", writer.created[0].Title)
	}
	if writer.created[0].BodyMarkdown == nil || *writer.created[0].BodyMarkdown != "Expanded version of the text with more details and depth." {
		t.Errorf("body_markdown did not match LLM response")
	}
}

func TestTransformService_Run_rewrite(t *testing.T) {
	llm := &mockLLMClient{
		response: &coredomain.LLMResponse{
			Content: "Rewritten version that is clearer and more engaging.",
		},
	}
	writer := &mockContentWriter{}
	svc := NewTransformService(llm, writer, uuid.New())

	err := svc.Run(context.Background(), TransformOptions{
		Text:   "Original unclear text.",
		Action: "rewrite",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(llm.lastPrompt, "Rewrite") {
		t.Error("expected rewrite prompt to contain 'Rewrite'")
	}
	if !strings.Contains(llm.lastPrompt, "Original unclear text.") {
		t.Error("expected rewrite prompt to include the original text")
	}

	if len(writer.created) != 1 {
		t.Fatalf("expected 1 created content, got %d", len(writer.created))
	}
	if writer.created[0].Title == nil || *writer.created[0].Title != "AI rewrite suggestion" {
		t.Errorf("expected title 'AI rewrite suggestion', got '%v'", writer.created[0].Title)
	}
}

func TestTransformService_Run_unknownAction(t *testing.T) {
	llm := &mockLLMClient{
		response: &coredomain.LLMResponse{Content: "should not be called"},
	}
	writer := &mockContentWriter{}
	svc := NewTransformService(llm, writer, uuid.New())

	err := svc.Run(context.Background(), TransformOptions{
		Text:   "Some text.",
		Action: "unknown",
	})
	if err == nil {
		t.Fatal("expected error for unknown action")
	}
	if !strings.Contains(err.Error(), "unknown action") {
		t.Errorf("expected error to mention 'unknown action', got '%v'", err)
	}

	if llm.lastPrompt != "" {
		t.Error("expected LLM not to be called for unknown action")
	}
	if len(writer.created) != 0 {
		t.Error("expected no content to be created for unknown action")
	}
}

func TestTransformService_Run_llmError(t *testing.T) {
	llm := &mockLLMClient{
		err: errors.New("LLM rate limit exceeded"),
	}
	writer := &mockContentWriter{}
	svc := NewTransformService(llm, writer, uuid.New())

	err := svc.Run(context.Background(), TransformOptions{
		Text:   "Some text.",
		Action: "expand",
	})
	if err == nil {
		t.Fatal("expected error when LLM fails")
	}
	if !strings.Contains(err.Error(), "LLM transform") {
		t.Errorf("expected error to mention 'LLM transform', got '%v'", err)
	}
	if len(writer.created) != 0 {
		t.Error("expected no content to be created when LLM fails")
	}
}

func TestTransformService_Run_emptyText(t *testing.T) {
	llm := &mockLLMClient{
		response: &coredomain.LLMResponse{Content: "Expanded empty text."},
	}
	writer := &mockContentWriter{}
	svc := NewTransformService(llm, writer, uuid.New())

	err := svc.Run(context.Background(), TransformOptions{
		Text:   "",
		Action: "expand",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(writer.created) != 1 {
		t.Fatalf("expected 1 created content, got %d", len(writer.created))
	}
}

func TestTransformService_Run_persistError(t *testing.T) {
	llm := &mockLLMClient{
		response: &coredomain.LLMResponse{Content: "Transformed text."},
	}
	errorWriter := &errorContentWriter{}
	svc := NewTransformService(llm, errorWriter, uuid.New())

	err := svc.Run(context.Background(), TransformOptions{
		Text:   "Some text.",
		Action: "rewrite",
	})
	if err == nil {
		t.Fatal("expected error when persist fails")
	}
	if !strings.Contains(err.Error(), "persisting transform result") {
		t.Errorf("expected error to mention 'persisting transform result', got '%v'", err)
	}
}

type errorContentWriter struct{}

func (e *errorContentWriter) Create(_ context.Context, _ *coredomain.GeneratedContent) error {
	return errors.New("database connection failed")
}
func (e *errorContentWriter) UpdateBody(_ context.Context, _ uuid.UUID, _, _ *string) error { return nil }
func (e *errorContentWriter) UpdateOutline(_ context.Context, _ uuid.UUID, _ *string) error { return nil }
func (e *errorContentWriter) UpdateStatus(_ context.Context, _ uuid.UUID, _ coredomain.ContentStatus) error {
	return nil
}
func (e *errorContentWriter) UpdateStatusWithPublishedAt(_ context.Context, _ uuid.UUID, _ coredomain.ContentStatus) error {
	return nil
}
func (e *errorContentWriter) SoftDelete(_ context.Context, _ uuid.UUID) error { return nil }

// Verify mockContentWriter implements the interface.
var _ ports.ContentWriter = (*mockContentWriter)(nil)
var _ ports.ContentWriter = (*errorContentWriter)(nil)
var _ ports.LLMClient = (*mockLLMClient)(nil)
