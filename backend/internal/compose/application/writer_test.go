package application

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/compose/domain"
	coredomain "github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

type mockWriterContent struct {
	ports.ContentWriter
	created []*coredomain.GeneratedContent
}

func (m *mockWriterContent) Create(ctx context.Context, content *coredomain.GeneratedContent) error {
	m.created = append(m.created, content)
	return nil
}
func (m *mockWriterContent) UpdateBody(ctx context.Context, id uuid.UUID, title, body *string) error { return nil }
func (m *mockWriterContent) UpdateStatus(ctx context.Context, id uuid.UUID, status coredomain.ContentStatus) error { return nil }
func (m *mockWriterContent) SoftDelete(ctx context.Context, id uuid.UUID) error { return nil }
func (m *mockWriterContent) UpdateCategory(ctx context.Context, id uuid.UUID, cat *string) error { return nil }

type mockLLMTest struct {
	response string
}

func (m *mockLLMTest) Complete(ctx context.Context, req coredomain.LLMRequest) (*coredomain.LLMResponse, error) {
	return &coredomain.LLMResponse{Content: m.response}, nil
}

func TestWriterService_Generate(t *testing.T) {
	uid := uuid.New()
	content := &mockWriterContent{}
	svc := &WriterService{
		llm: &mockLLMTest{
			response: `{"title": "Test Article", "body_markdown": "This is the body.", "subtitle": "A test"}`,
		},
		content: content,
		userID:  uid,
	}

	result, err := svc.Generate(context.Background(), GenerateParams{
		Topic: domain.Topic{
			Topic:     "Go Testing",
			ThemeArea: domain.ThemeArea("backend_infra"),
			Format:    domain.Format("tutorial"),
		},
		Voice: domain.VoiceCleanTechnical,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	if len(content.created) != 1 {
		t.Fatalf("expected 1 created item, got %d", len(content.created))
	}
	created := content.created[0]
	if created.Product != coredomain.ProductCompose {
		t.Errorf("expected ProductCompose, got %s", created.Product)
	}
}
