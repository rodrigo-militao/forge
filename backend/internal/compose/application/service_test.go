package application

import (
	"context"
	"errors"
	"strings"
	"sync"
	"testing"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/compose/domain"
	coredomain "github.com/rodrigo-militao/forge/internal/core/domain"
)

// mockTopicRepo implements domain.TopicRepository for testing.
type mockTopicRepo struct {
	mu      sync.Mutex
	history []domain.HistoryEntry
	histErr error
	createErr error
	created []*domain.Topic
}

func (m *mockTopicRepo) ListByUser(_ context.Context, _ uuid.UUID) ([]domain.Topic, error) {
	return nil, nil
}

func (m *mockTopicRepo) History(_ context.Context, _ uuid.UUID, _ int) ([]domain.HistoryEntry, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.history, m.histErr
}

func (m *mockTopicRepo) Create(_ context.Context, topic *domain.Topic) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.createErr != nil {
		return m.createErr
	}
	m.created = append(m.created, topic)
	return nil
}

var _ domain.TopicRepository = (*mockTopicRepo)(nil)

// ---- Constructor tests ----

func TestNewOutlineGeneratorService(t *testing.T) {
	llm := &mockLLMClient{}
	content := &mockContentWriter{}
	uid := uuid.New()
	svc := NewOutlineGeneratorService(llm, content, uid)
	if svc == nil {
		t.Fatal("expected non-nil service")
	}
	if svc.llm != llm {
		t.Error("llm field mismatch")
	}
	if svc.content != content {
		t.Error("content field mismatch")
	}
	if svc.userID != uid {
		t.Error("userID field mismatch")
	}
}

func TestNewTopicGeneratorService(t *testing.T) {
	llm := &mockLLMClient{}
	topics := &mockTopicRepo{}
	uid := uuid.New()
	svc := NewTopicGeneratorService(llm, topics, uid)
	if svc == nil {
		t.Fatal("expected non-nil service")
	}
	if svc.llm != llm {
		t.Error("llm field mismatch")
	}
	if svc.topics != topics {
		t.Error("topics field mismatch")
	}
	if svc.userID != uid {
		t.Error("userID field mismatch")
	}
}

func TestNewWriterService(t *testing.T) {
	llm := &mockLLMClient{}
	content := &mockContentWriter{}
	uid := uuid.New()
	svc := NewWriterService(llm, content, uid)
	if svc == nil {
		t.Fatal("expected non-nil service")
	}
	if svc.llm != llm {
		t.Error("llm field mismatch")
	}
	if svc.content != content {
		t.Error("content field mismatch")
	}
	if svc.userID != uid {
		t.Error("userID field mismatch")
	}
}

// ---- OutlineGeneratorService.Generate ----

func TestOutlineGeneratorService_Generate_Success(t *testing.T) {
	llm := &mockLLMClient{
		response: &coredomain.LLMResponse{
			Content: `{"title": "Testing Go Services", "sections": [{"heading": "Intro", "points": ["why test", "setup"]}]}`,
		},
	}
	content := &mockContentWriter{}
	svc := NewOutlineGeneratorService(llm, content, uuid.New())

	result, err := svc.Generate(context.Background(), OutlineParams{Theme: "Go Testing"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	if result.Outline == "" {
		t.Error("expected non-empty outline")
	}
	if result.ContentID == uuid.Nil {
		t.Error("expected non-nil ContentID")
	}
	if !strings.Contains(result.Outline, "Testing Go Services") {
		t.Error("expected outline to contain the title")
	}
	if !strings.Contains(result.Outline, "Intro") {
		t.Error("expected outline to contain 'Intro' heading")
	}
	if len(content.created) != 1 {
		t.Fatalf("expected 1 created content, got %d", len(content.created))
	}
	if content.created[0].Product != coredomain.ProductCompose {
		t.Errorf("expected ProductCompose, got %v", content.created[0].Product)
	}
}

func TestOutlineGeneratorService_Generate_LLMError(t *testing.T) {
	llm := &mockLLMClient{
		err: errors.New("LLM API unavailable"),
	}
	content := &mockContentWriter{}
	svc := NewOutlineGeneratorService(llm, content, uuid.New())

	_, err := svc.Generate(context.Background(), OutlineParams{Theme: "Go"})
	if err == nil {
		t.Fatal("expected error when LLM fails")
	}
	if !strings.Contains(err.Error(), "LLM outline generation") {
		t.Errorf("expected error to mention 'LLM outline generation', got %v", err)
	}
	if len(content.created) != 0 {
		t.Error("expected no content to be created when LLM fails")
	}
}

func TestOutlineGeneratorService_Generate_ParseError(t *testing.T) {
	llm := &mockLLMClient{
		response: &coredomain.LLMResponse{
			Content: "this is not JSON at all",
		},
	}
	content := &mockContentWriter{}
	svc := NewOutlineGeneratorService(llm, content, uuid.New())

	_, err := svc.Generate(context.Background(), OutlineParams{Theme: "Go"})
	if err == nil {
		t.Fatal("expected error when parsing fails")
	}
	if !strings.Contains(err.Error(), "parsing outline") {
		t.Errorf("expected error to mention 'parsing outline', got %v", err)
	}
	if len(content.created) != 0 {
		t.Error("expected no content to be created when parsing fails")
	}
}

func TestOutlineGeneratorService_Generate_PersistError(t *testing.T) {
	llm := &mockLLMClient{
		response: &coredomain.LLMResponse{
			Content: `{"title": "Go Testing", "sections": [{"heading": "Intro", "points": ["test"]}]}`,
		},
	}
	errorWriter := &errorContentWriter{}
	svc := NewOutlineGeneratorService(llm, errorWriter, uuid.New())

	_, err := svc.Generate(context.Background(), OutlineParams{Theme: "Go"})
	if err == nil {
		t.Fatal("expected error when persist fails")
	}
	if !strings.Contains(err.Error(), "persisting outline") {
		t.Errorf("expected error to mention 'persisting outline', got %v", err)
	}
}

// ---- TopicGeneratorService.Generate ----

func TestTopicGeneratorService_Generate_Success(t *testing.T) {
	llm := &mockLLMClient{
		response: &coredomain.LLMResponse{
			Content: `{"topic": "Why B-Trees Matter", "theme_area": "backend_infra", "format": "deep_dive", "one_line_pitch": "A deep dive", "target_length_words": 1500}`,
		},
	}
	topics := &mockTopicRepo{
		history: []domain.HistoryEntry{
			{Topic: domain.Topic{Topic: "Previous Topic", ThemeArea: "ai", Format: "tutorial"}},
		},
	}
	svc := NewTopicGeneratorService(llm, topics, uuid.New())

	result, err := svc.Generate(context.Background())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	if result.Topic.Topic != "Why B-Trees Matter" {
		t.Errorf("expected topic 'Why B-Trees Matter', got '%s'", result.Topic.Topic)
	}
	if result.Topic.ThemeArea != domain.ThemeBackendInfra {
		t.Errorf("expected ThemeBackendInfra, got %s", result.Topic.ThemeArea)
	}
	if result.Topic.Format != domain.FormatDeepDive {
		t.Errorf("expected FormatDeepDive, got %s", result.Topic.Format)
	}
	if result.Topic.OneLinePitch != "A deep dive" {
		t.Errorf("expected 'A deep dive', got '%s'", result.Topic.OneLinePitch)
	}
	if result.Topic.UserID == uuid.Nil {
		t.Error("expected UserID to be set")
	}
	if result.Topic.CreatedAt.IsZero() {
		t.Error("expected CreatedAt to be set")
	}
	if result.Topic.UpdatedAt.IsZero() {
		t.Error("expected UpdatedAt to be set")
	}
	if len(topics.created) != 1 {
		t.Fatalf("expected 1 created topic, got %d", len(topics.created))
	}
}

func TestTopicGeneratorService_Generate_HistoryError(t *testing.T) {
	llm := &mockLLMClient{
		response: &coredomain.LLMResponse{Content: "should not be called"},
	}
	topics := &mockTopicRepo{
		histErr: errors.New("database connection failed"),
	}
	svc := NewTopicGeneratorService(llm, topics, uuid.New())

	_, err := svc.Generate(context.Background())
	if err == nil {
		t.Fatal("expected error when history load fails")
	}
	if !strings.Contains(err.Error(), "loading topic history") {
		t.Errorf("expected error to mention 'loading topic history', got %v", err)
	}
}

func TestTopicGeneratorService_Generate_LLMError(t *testing.T) {
	llm := &mockLLMClient{
		err: errors.New("LLM rate limit exceeded"),
	}
	topics := &mockTopicRepo{}
	svc := NewTopicGeneratorService(llm, topics, uuid.New())

	_, err := svc.Generate(context.Background())
	if err == nil {
		t.Fatal("expected error when LLM fails")
	}
	if !strings.Contains(err.Error(), "LLM topic generation") {
		t.Errorf("expected error to mention 'LLM topic generation', got %v", err)
	}
}

func TestTopicGeneratorService_Generate_ParseError(t *testing.T) {
	llm := &mockLLMClient{
		response: &coredomain.LLMResponse{
			Content: "not valid JSON response",
		},
	}
	topics := &mockTopicRepo{}
	svc := NewTopicGeneratorService(llm, topics, uuid.New())

	_, err := svc.Generate(context.Background())
	if err == nil {
		t.Fatal("expected error when parsing fails")
	}
	if !strings.Contains(err.Error(), "parsing topic") {
		t.Errorf("expected error to mention 'parsing topic', got %v", err)
	}
}

func TestTopicGeneratorService_Generate_PersistError(t *testing.T) {
	llm := &mockLLMClient{
		response: &coredomain.LLMResponse{
			Content: `{"topic": "Go Testing Patterns", "theme_area": "backend_infra", "format": "tutorial", "one_line_pitch": "Learn testing", "target_length_words": 1200}`,
		},
	}
	topics := &mockTopicRepo{
		createErr: errors.New("duplicate key violation"),
	}
	svc := NewTopicGeneratorService(llm, topics, uuid.New())

	_, err := svc.Generate(context.Background())
	if err == nil {
		t.Fatal("expected error when persist fails")
	}
	if !strings.Contains(err.Error(), "persisting topic") {
		t.Errorf("expected error to mention 'persisting topic', got %v", err)
	}
}

// ---- WriterService.Generate additional cases ----

func TestWriterService_Generate_UnknownVoice(t *testing.T) {
	llm := &mockLLMClient{
		response: &coredomain.LLMResponse{Content: "should not be called"},
	}
	content := &mockContentWriter{}
	svc := NewWriterService(llm, content, uuid.New())

	_, err := svc.Generate(context.Background(), GenerateParams{
		Topic: domain.Topic{
			Topic:     "Go Testing",
			ThemeArea: domain.ThemeBackendInfra,
			Format:    domain.FormatTutorial,
		},
		Voice: "nonexistent_voice",
	})
	if err == nil {
		t.Fatal("expected error for unknown voice")
	}
	if !strings.Contains(err.Error(), "unknown voice") {
		t.Errorf("expected error to mention 'unknown voice', got %v", err)
	}
	if llm.lastPrompt != "" {
		t.Error("expected LLM not to be called for unknown voice")
	}
	if len(content.created) != 0 {
		t.Error("expected no content to be created for unknown voice")
	}
}

func TestWriterService_Generate_LLMError(t *testing.T) {
	llm := &mockLLMClient{
		err: errors.New("LLM API timeout"),
	}
	content := &mockContentWriter{}
	svc := NewWriterService(llm, content, uuid.New())

	_, err := svc.Generate(context.Background(), GenerateParams{
		Topic: domain.Topic{
			Topic:     "Go Testing",
			ThemeArea: domain.ThemeBackendInfra,
			Format:    domain.FormatTutorial,
		},
		Voice: domain.VoiceConfessional,
	})
	if err == nil {
		t.Fatal("expected error when LLM fails")
	}
	if !strings.Contains(err.Error(), "LLM article generation") {
		t.Errorf("expected error to mention 'LLM article generation', got %v", err)
	}
	if len(content.created) != 0 {
		t.Error("expected no content to be created when LLM fails")
	}
}

func TestWriterService_Generate_ParseError(t *testing.T) {
	llm := &mockLLMClient{
		response: &coredomain.LLMResponse{
			Content: "not valid JSON at all",
		},
	}
	content := &mockContentWriter{}
	svc := NewWriterService(llm, content, uuid.New())

	_, err := svc.Generate(context.Background(), GenerateParams{
		Topic: domain.Topic{
			Topic:     "Go Testing",
			ThemeArea: domain.ThemeBackendInfra,
			Format:    domain.FormatTutorial,
		},
		Voice: domain.VoiceConfessional,
	})
	if err == nil {
		t.Fatal("expected error when parsing fails")
	}
	if !strings.Contains(err.Error(), "parsing article") {
		t.Errorf("expected error to mention 'parsing article', got %v", err)
	}
	if len(content.created) != 0 {
		t.Error("expected no content to be created when parsing fails")
	}
}

func TestWriterService_Generate_PersistError(t *testing.T) {
	llm := &mockLLMClient{
		response: &coredomain.LLMResponse{
			Content: `{"title": "Test Title", "subtitle": "A test", "body_markdown": "This is the body."}`,
		},
	}
	errorWriter := &errorContentWriter{}
	svc := NewWriterService(llm, errorWriter, uuid.New())

	_, err := svc.Generate(context.Background(), GenerateParams{
		Topic: domain.Topic{
			Topic:     "Go Testing",
			ThemeArea: domain.ThemeBackendInfra,
			Format:    domain.FormatTutorial,
		},
		Voice: domain.VoiceConfessional,
	})
	if err == nil {
		t.Fatal("expected error when persist fails")
	}
	if !strings.Contains(err.Error(), "persisting article") {
		t.Errorf("expected error to mention 'persisting article', got %v", err)
	}
}
