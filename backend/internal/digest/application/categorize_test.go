package application

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/domain"
)

type mockCategorizeWriter struct {
	updated map[uuid.UUID]*string
}

func (m *mockCategorizeWriter) Create(ctx context.Context, content *domain.GeneratedContent) error { return nil }
func (m *mockCategorizeWriter) UpdateBody(ctx context.Context, id uuid.UUID, title, body *string) error { return nil }
func (m *mockCategorizeWriter) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.ContentStatus) error { return nil }
func (m *mockCategorizeWriter) SoftDelete(ctx context.Context, id uuid.UUID) error { return nil }
func (m *mockCategorizeWriter) UpdateCategory(ctx context.Context, id uuid.UUID, category *string) error {
	if m.updated == nil {
		m.updated = make(map[uuid.UUID]*string)
	}
	m.updated[id] = category
	return nil
}

type mockCategorizeQueries struct {
	uncategorized []domain.GeneratedContent
	categories    []string
	err           error
}

func (m *mockCategorizeQueries) ExistsByURL(ctx context.Context, userID uuid.UUID, url string) (bool, error) { return false, nil }
func (m *mockCategorizeQueries) ListWithoutCategory(ctx context.Context, userID uuid.UUID, limit int) ([]domain.GeneratedContent, error) {
	return m.uncategorized, m.err
}
func (m *mockCategorizeQueries) ListUserCategories(ctx context.Context, userID uuid.UUID) ([]string, error) {
	return m.categories, nil
}
func (m *mockCategorizeQueries) ListApprovedDigest(ctx context.Context, userID uuid.UUID) ([]domain.GeneratedContent, error) { return nil, nil }

type mockLLM struct {
	response *domain.LLMResponse
	err      error
}

func (m *mockLLM) Complete(ctx context.Context, req domain.LLMRequest) (*domain.LLMResponse, error) {
	return m.response, m.err
}

func TestCategorizeService_Run_HappyPath(t *testing.T) {
	articleID := uuid.New()
	svc := &CategorizeService{
		cheapLLM: &mockLLM{response: &domain.LLMResponse{
			Content: `{"` + articleID.String() + `": "AI"}`,
		}},
		content:       &mockCategorizeWriter{},
		digestQueries: &mockCategorizeQueries{
			uncategorized: []domain.GeneratedContent{
				{ID: articleID, Title: strPtr("test")},
			},
			categories: []string{"Web"},
		},
		userID: uuid.New(),
	}

	if err := svc.Run(context.Background()); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	writer := svc.content.(*mockCategorizeWriter)
	cat, ok := writer.updated[articleID]
	if !ok {
		t.Fatal("article was not updated")
	}
	if cat == nil || *cat != "AI" {
		t.Errorf("expected category AI, got %v", cat)
	}
}

func TestCategorizeService_Run_EmptyList(t *testing.T) {
	svc := &CategorizeService{
		cheapLLM:      &mockLLM{},
		content:       &mockCategorizeWriter{},
		digestQueries: &mockCategorizeQueries{},
		userID:        uuid.New(),
	}

	if err := svc.Run(context.Background()); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestCategorizeService_Run_InvalidJSON(t *testing.T) {
	svc := &CategorizeService{
		cheapLLM: &mockLLM{response: &domain.LLMResponse{
			Content: `not json`,
		}},
		content:       &mockCategorizeWriter{},
		digestQueries: &mockCategorizeQueries{
			uncategorized: []domain.GeneratedContent{
				{ID: uuid.New(), Title: strPtr("test")},
			},
		},
		userID: uuid.New(),
	}

	if err := svc.Run(context.Background()); err == nil {
		t.Fatal("expected error for invalid JSON, got nil")
	}
}

func TestCategorizeService_Run_LLMError(t *testing.T) {
	svc := &CategorizeService{
		cheapLLM: &mockLLM{err: errors.New("LLM unavailable")},
		content:  &mockCategorizeWriter{},
		digestQueries: &mockCategorizeQueries{
			uncategorized: []domain.GeneratedContent{
				{ID: uuid.New(), Title: strPtr("test")},
			},
		},
		userID: uuid.New(),
	}

	if err := svc.Run(context.Background()); err == nil {
		t.Fatal("expected error from LLM, got nil")
	}
}
