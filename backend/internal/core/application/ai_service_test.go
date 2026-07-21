package application

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

type mockAIContent struct {
	ports.ContentRepository
	content *domain.GeneratedContent
	getErr  error
}

func (m *mockAIContent) GetByID(_ context.Context, _ uuid.UUID) (*domain.GeneratedContent, error) {
	return m.content, m.getErr
}

func (m *mockAIContent) GetDigestStats(_ context.Context, _ uuid.UUID) (*ports.DigestStats, error) {
	return &ports.DigestStats{}, nil
}

func (m *mockAIContent) ExistsByURL(_ context.Context, _ uuid.UUID, _ string) (bool, error) { return false, nil }
func (m *mockAIContent) ListWithoutCategory(_ context.Context, _ uuid.UUID, _ int) ([]domain.GeneratedContent, error) { return nil, nil }
func (m *mockAIContent) ListUserCategories(_ context.Context, _ uuid.UUID) ([]string, error) { return nil, nil }
func (m *mockAIContent) ListUserTags(_ context.Context, _ uuid.UUID) ([]string, error) { return nil, nil }
func (m *mockAIContent) AddCategory(_ context.Context, _ uuid.UUID, _ string) error { return nil }
func (m *mockAIContent) RemoveCategory(_ context.Context, _ uuid.UUID, _ string) error { return nil }
func (m *mockAIContent) SetCategories(_ context.Context, _ uuid.UUID, _ []string) error { return nil }
func (m *mockAIContent) AddTag(_ context.Context, _ uuid.UUID, _ string) error { return nil }
func (m *mockAIContent) RemoveTag(_ context.Context, _ uuid.UUID, _ string) error { return nil }
func (m *mockAIContent) Create(_ context.Context, _ *domain.GeneratedContent) error { return nil }
func (m *mockAIContent) UpdateBody(_ context.Context, _ uuid.UUID, _, _ *string) error { return nil }
func (m *mockAIContent) UpdateOutline(_ context.Context, _ uuid.UUID, _ *string) error { return nil }
func (m *mockAIContent) UpdateStatus(_ context.Context, _ uuid.UUID, _ domain.ContentStatus) error { return nil }
func (m *mockAIContent) UpdateStatusWithPublishedAt(_ context.Context, _ uuid.UUID, _ domain.ContentStatus) error { return nil }
func (m *mockAIContent) SoftDelete(_ context.Context, _ uuid.UUID) error { return nil }
func (m *mockAIContent) ListByUser(_ context.Context, _ uuid.UUID) ([]domain.GeneratedContent, error) { return nil, nil }
func (m *mockAIContent) ListByUserFiltered(_ context.Context, _ uuid.UUID, _, _ *string) ([]domain.GeneratedContent, error) { return nil, nil }

type mockAILlm struct {
	ports.LLMClient
	response *domain.LLMResponse
}

func (m *mockAILlm) Complete(_ context.Context, _ domain.LLMRequest) (*domain.LLMResponse, error) {
	return m.response, nil
}

type mockAIRefs struct {
	ports.ReferenceRepository
}

func (m *mockAIRefs) ListByContent(_ context.Context, _ uuid.UUID) ([]domain.Reference, error) { return nil, nil }

type mockAIAnalysis struct {
	ports.AIAnalysisRepository
	analysis *domain.AIAnalysis
}

func (m *mockAIAnalysis) GetLatestByContentID(_ context.Context, _, _ uuid.UUID) (*domain.AIAnalysis, error) {
	if m.analysis != nil {
		return m.analysis, nil
	}
	return nil, domain.ErrNotFound
}

func (m *mockAIAnalysis) Create(_ context.Context, a *domain.AIAnalysis) error {
	a.ID = uuid.New()
	m.analysis = a
	return nil
}

func TestAIService_GetLatestAnalysis_HappyPath(t *testing.T) {
	contentID := uuid.New()
	analysisRepo := &mockAIAnalysis{
		analysis: &domain.AIAnalysis{
			ID:          uuid.New(),
			ContentID:   contentID,
			Score:       85,
			Summary:     "Good article",
			Strengths:   []string{"clear argument"},
			Improvements: []string{"add examples"},
		},
	}
	svc := NewAIService(&mockAILlm{}, &mockAIContent{content: &domain.GeneratedContent{ID: contentID, UserID: testUser}}, &mockAIRefs{}, analysisRepo)

	result, err := svc.GetLatestAnalysis(context.Background(), contentID, testUser)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Score != 85 {
		t.Errorf("expected score 85, got %d", result.Score)
	}
}

func TestAIService_GetLatestAnalysis_NotFound(t *testing.T) {
	contentID := uuid.New()
	svc := NewAIService(&mockAILlm{}, &mockAIContent{content: &domain.GeneratedContent{ID: contentID, UserID: testUser}}, &mockAIRefs{}, &mockAIAnalysis{})

	_, err := svc.GetLatestAnalysis(context.Background(), contentID, testUser)
	if err == nil {
		t.Fatal("expected error for no analysis")
	}
}
