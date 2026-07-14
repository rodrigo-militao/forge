package application

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

type mockCategorizer struct {
	added map[uuid.UUID][]string
}

func (m *mockCategorizer) AddCategory(ctx context.Context, id uuid.UUID, category string) error {
	if m.added == nil {
		m.added = make(map[uuid.UUID][]string)
	}
	m.added[id] = append(m.added[id], category)
	return nil
}
func (m *mockCategorizer) RemoveCategory(ctx context.Context, id uuid.UUID, category string) error { return nil }
func (m *mockCategorizer) SetCategories(ctx context.Context, id uuid.UUID, categories []string) error { return nil }
func (m *mockCategorizer) ListUserCategories(ctx context.Context, userID uuid.UUID) ([]string, error) { return nil, nil }

type mockCategorizeQueries struct {
	uncategorized []domain.GeneratedContent
	categories    []string
	err           error
}

func (m *mockCategorizeQueries) ExistsByURL(ctx context.Context, userID uuid.UUID, url string) (bool, error) { return false, nil }
func (m *mockCategorizeQueries) ListWithoutCategory(ctx context.Context, userID uuid.UUID, limit int) ([]domain.GeneratedContent, error) {
	return m.uncategorized, m.err
}
func (m *mockCategorizeQueries) GetDigestStats(ctx context.Context, userID uuid.UUID) (*ports.DigestStats, error) {
	return &ports.DigestStats{}, nil
}

type mockLLM struct {
	response *domain.LLMResponse
	err      error
}

func (m *mockLLM) Complete(ctx context.Context, req domain.LLMRequest) (*domain.LLMResponse, error) {
	return m.response, m.err
}

func TestCategorizeService_Run_HappyPath_SingleCategory(t *testing.T) {
	articleID := uuid.New()
	writer := &mockCategorizer{}
	svc := &CategorizeService{
		cheapLLM: &mockLLM{response: &domain.LLMResponse{
			Content: `{"` + articleID.String() + `": ["AI"]}`,
		}},
		categorizer:   writer,
		digestQueries: &mockCategorizeQueries{
			uncategorized: []domain.GeneratedContent{
				{ID: articleID, Title: strPtr("test")},
			},
		},
		userID: uuid.New(),
	}

	if err := svc.Run(context.Background()); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	cats, ok := writer.added[articleID]
	if !ok {
		t.Fatal("article was not updated")
	}
	if len(cats) != 1 || cats[0] != "AI" {
		t.Errorf("expected [AI], got %v", cats)
	}
}

func TestCategorizeService_Run_MultipleCategories(t *testing.T) {
	articleID := uuid.New()
	writer := &mockCategorizer{}
	svc := &CategorizeService{
		cheapLLM: &mockLLM{response: &domain.LLMResponse{
			Content: `{"` + articleID.String() + `": ["AI", "Web", "Systems"]}`,
		}},
		categorizer:   writer,
		digestQueries: &mockCategorizeQueries{
			uncategorized: []domain.GeneratedContent{
				{ID: articleID, Title: strPtr("test")},
			},
		},
		userID: uuid.New(),
	}

	if err := svc.Run(context.Background()); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	cats, ok := writer.added[articleID]
	if !ok {
		t.Fatal("article was not updated")
	}
	if len(cats) != 3 || cats[0] != "AI" || cats[1] != "Web" || cats[2] != "Systems" {
		t.Errorf("expected [AI Web Systems], got %v", cats)
	}
}

func TestCategorizeService_Run_EmptyList(t *testing.T) {
	svc := &CategorizeService{
		cheapLLM:      &mockLLM{},
		categorizer:   &mockCategorizer{},
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
		categorizer: &mockCategorizer{},
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
		categorizer: &mockCategorizer{},
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
