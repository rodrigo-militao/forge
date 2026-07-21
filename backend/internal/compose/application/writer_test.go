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
	ports.ContentRepository
	created []*coredomain.GeneratedContent
}

func (m *mockWriterContent) Create(ctx context.Context, content *coredomain.GeneratedContent) error {
	m.created = append(m.created, content)
	return nil
}
func (m *mockWriterContent) UpdateBody(ctx context.Context, id uuid.UUID, title, body *string) error { return nil }
func (m *mockWriterContent) SoftDelete(ctx context.Context, id uuid.UUID) error { return nil }
func (m *mockWriterContent) UpdateCategory(ctx context.Context, id uuid.UUID, cat *string) error { return nil }
func (m *mockWriterContent) UpdateOutline(_ context.Context, _ uuid.UUID, _ *string) error { return nil }
func (m *mockWriterContent) UpdateStatus(_ context.Context, _ uuid.UUID, _ coredomain.ContentStatus) error { return nil }
func (m *mockWriterContent) UpdateStatusWithPublishedAt(_ context.Context, _ uuid.UUID, _ coredomain.ContentStatus) error { return nil }
func (m *mockWriterContent) GetByID(_ context.Context, _ uuid.UUID) (*coredomain.GeneratedContent, error) { return nil, nil }
func (m *mockWriterContent) ListByUser(_ context.Context, _ uuid.UUID) ([]coredomain.GeneratedContent, error) { return nil, nil }
func (m *mockWriterContent) ListByUserFiltered(_ context.Context, _ uuid.UUID, _, _ *string) ([]coredomain.GeneratedContent, error) { return nil, nil }
func (m *mockWriterContent) AddCategory(_ context.Context, _ uuid.UUID, _ string) error { return nil }
func (m *mockWriterContent) RemoveCategory(_ context.Context, _ uuid.UUID, _ string) error { return nil }
func (m *mockWriterContent) SetCategories(_ context.Context, _ uuid.UUID, _ []string) error { return nil }
func (m *mockWriterContent) ListUserCategories(_ context.Context, _ uuid.UUID) ([]string, error) { return nil, nil }
func (m *mockWriterContent) ExistsByURL(_ context.Context, _ uuid.UUID, _ string) (bool, error) { return false, nil }
func (m *mockWriterContent) ListWithoutCategory(_ context.Context, _ uuid.UUID, _ int) ([]coredomain.GeneratedContent, error) { return nil, nil }
func (m *mockWriterContent) GetDigestStats(_ context.Context, _ uuid.UUID) (*ports.DigestStats, error) { return nil, nil }
func (m *mockWriterContent) AddTag(_ context.Context, _ uuid.UUID, _ string) error { return nil }
func (m *mockWriterContent) RemoveTag(_ context.Context, _ uuid.UUID, _ string) error { return nil }
func (m *mockWriterContent) ListUserTags(_ context.Context, _ uuid.UUID) ([]string, error) { return nil, nil }

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
