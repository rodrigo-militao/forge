package application

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
	"github.com/rodrigo-militao/forge/internal/lib"
)

// --- Mocks (shared with discovery_test) ---

type mockCategorizer struct {
	added             map[uuid.UUID][]string
	listUserCats      []string
	listUserCatsErr   error
	addCategoryErr    error
}

func (m *mockCategorizer) AddCategory(_ context.Context, id uuid.UUID, category string) error {
	if m.addCategoryErr != nil {
		return m.addCategoryErr
	}

	if m.added == nil {
		m.added = make(map[uuid.UUID][]string)
	}
	m.added[id] = append(m.added[id], category)
	return nil
}
func (m *mockCategorizer) RemoveCategory(_ context.Context, _ uuid.UUID, _ string) error  { return nil }
func (m *mockCategorizer) SetCategories(_ context.Context, _ uuid.UUID, _ []string) error { return nil }
func (m *mockCategorizer) ListUserCategories(_ context.Context, _ uuid.UUID) ([]string, error) {
	return m.listUserCats, m.listUserCatsErr
}

type mockCategorizeQueries struct {
	uncategorized []domain.GeneratedContent
	categories    []string
	err           error
}

func (m *mockCategorizeQueries) ExistsByURL(_ context.Context, _ uuid.UUID, _ string) (bool, error) { return false, nil }
func (m *mockCategorizeQueries) ListWithoutCategory(_ context.Context, _ uuid.UUID, _ int) ([]domain.GeneratedContent, error) {
	return m.uncategorized, m.err
}
func (m *mockCategorizeQueries) GetDigestStats(_ context.Context, _ uuid.UUID) (*ports.DigestStats, error) {
	return &ports.DigestStats{}, nil
}

// We use the mockLLM from discovery_test (defined in that file, same package)

// --- CategorizeService.Run tests ---

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
				{ID: articleID, Title: lib.StrPtr("test")},
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
				{ID: articleID, Title: lib.StrPtr("test")},
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
				{ID: uuid.New(), Title: lib.StrPtr("test")},
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
				{ID: uuid.New(), Title: lib.StrPtr("test")},
			},
		},
		userID: uuid.New(),
	}

	if err := svc.Run(context.Background()); err == nil {
		t.Fatal("expected error from LLM, got nil")
	}
}

func TestCategorizeService_Run_QueryError(t *testing.T) {
	svc := &CategorizeService{
		cheapLLM:      &mockLLM{},
		categorizer:   &mockCategorizer{},
		digestQueries: &mockCategorizeQueries{err: errors.New("DB error")},
		userID:        uuid.New(),
	}

	if err := svc.Run(context.Background()); err == nil {
		t.Fatal("expected error from query, got nil")
	}
}

func TestCategorizeService_Run_WithExistingCategories(t *testing.T) {
	articleID := uuid.New()
	writer := &mockCategorizer{
		listUserCats: []string{"AI", "Machine Learning"},
	}
	svc := &CategorizeService{
		cheapLLM: &mockLLM{response: &domain.LLMResponse{
			Content: `{"` + articleID.String() + `": ["AI", "Databases"]}`,
		}},
		categorizer:   writer,
		digestQueries: &mockCategorizeQueries{
			uncategorized: []domain.GeneratedContent{
				{ID: articleID, Title: lib.StrPtr("test")},
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
	if len(cats) != 2 {
		t.Errorf("expected 2 categories, got %v", cats)
	}
}

func TestCategorizeService_Run_ListExistingCategoriesError(t *testing.T) {
	articleID := uuid.New()
	writer := &mockCategorizer{
		listUserCatsErr: errors.New("list error"),
	}
	svc := &CategorizeService{
		cheapLLM: &mockLLM{response: &domain.LLMResponse{
			Content: `{"` + articleID.String() + `": ["AI"]}`,
		}},
		categorizer:   writer,
		digestQueries: &mockCategorizeQueries{
			uncategorized: []domain.GeneratedContent{
				{ID: articleID, Title: lib.StrPtr("test")},
			},
		},
		userID: uuid.New(),
	}

	// Should NOT fail — just log a warning and proceed without vocabulary
	if err := svc.Run(context.Background()); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	cats, ok := writer.added[articleID]
	if !ok {
		t.Fatal("article was not updated despite list categories error")
	}
	if len(cats) != 1 || cats[0] != "AI" {
		t.Errorf("expected [AI], got %v", cats)
	}
}

func TestCategorizeService_Run_MissingArticleInResponse(t *testing.T) {
	articleID1 := uuid.New()
	articleID2 := uuid.New()
	writer := &mockCategorizer{}
	svc := &CategorizeService{
		cheapLLM: &mockLLM{response: &domain.LLMResponse{
			Content: `{"` + articleID1.String() + `": ["AI"]}`,
		}},
		categorizer:   writer,
		digestQueries: &mockCategorizeQueries{
			uncategorized: []domain.GeneratedContent{
				{ID: articleID1, Title: lib.StrPtr("article 1")},
				{ID: articleID2, Title: lib.StrPtr("article 2")},
			},
		},
		userID: uuid.New(),
	}

	if err := svc.Run(context.Background()); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// articleID1 should have categories
	if _, ok := writer.added[articleID1]; !ok {
		t.Error("articleID1 should have been categorized")
	}
	// articleID2 should NOT have categories (missing from LLM response)
	if _, ok := writer.added[articleID2]; ok {
		t.Error("articleID2 should NOT have been categorized (missing from LLM response)")
	}
}

func TestCategorizeService_Run_EmptyCategoriesArray(t *testing.T) {
	articleID := uuid.New()
	writer := &mockCategorizer{}
	svc := &CategorizeService{
		cheapLLM: &mockLLM{response: &domain.LLMResponse{
			Content: `{"` + articleID.String() + `": []}`,
		}},
		categorizer:   writer,
		digestQueries: &mockCategorizeQueries{
			uncategorized: []domain.GeneratedContent{
				{ID: articleID, Title: lib.StrPtr("test")},
			},
		},
		userID: uuid.New(),
	}

	if err := svc.Run(context.Background()); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if _, ok := writer.added[articleID]; ok {
		t.Error("article should NOT have been categorized with empty category array")
	}
}

func TestCategorizeService_Run_WhitespaceCategories(t *testing.T) {
	articleID := uuid.New()
	writer := &mockCategorizer{}
	svc := &CategorizeService{
		cheapLLM: &mockLLM{response: &domain.LLMResponse{
			Content: `{"` + articleID.String() + `": ["  AI  ", "  ", "ML"]}`,
		}},
		categorizer:   writer,
		digestQueries: &mockCategorizeQueries{
			uncategorized: []domain.GeneratedContent{
				{ID: articleID, Title: lib.StrPtr("test")},
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
	// "  AI  " → "AI" after TrimSpace, "  " → "" → skipped, "ML" stays
	if len(cats) != 2 {
		t.Fatalf("expected 2 categories (whitespace-trimmed), got %v", cats)
	}
	if cats[0] != "AI" {
		t.Errorf("expected first category 'AI', got '%s'", cats[0])
	}
	if cats[1] != "ML" {
		t.Errorf("expected second category 'ML', got '%s'", cats[1])
	}
}

// --- buildCategorizePrompt tests ---

func Test_buildCategorizePrompt(t *testing.T) {
	id := uuid.New()
	title := "Go Performance"
	body := "Optimizing Go applications"
	articles := []domain.GeneratedContent{
		{ID: id, Title: &title, BodyMarkdown: &body},
	}

	prompt := buildCategorizePrompt(articles, nil)

	if !strings.Contains(prompt, id.String()) {
		t.Error("expected article ID in prompt")
	}
	if !strings.Contains(prompt, "Go Performance") {
		t.Error("expected article title in prompt")
	}
	if !strings.Contains(prompt, "Optimizing Go applications") {
		t.Error("expected article body in prompt")
	}
	if strings.Contains(prompt, "Existing categories") {
		t.Error("should not mention existing categories when none provided")
	}
}

func Test_buildCategorizePrompt_WithExistingCategories(t *testing.T) {
	id := uuid.New()
	title := "Go Performance"
	articles := []domain.GeneratedContent{
		{ID: id, Title: &title},
	}
	existing := []string{"AI", "Go", "Web"}

	prompt := buildCategorizePrompt(articles, existing)

	if !strings.Contains(prompt, "Existing categories (prefer these):") {
		t.Error("expected existing categories header")
	}
	if !strings.Contains(prompt, "- AI") {
		t.Error("expected AI in existing categories")
	}
	if !strings.Contains(prompt, "- Go") {
		t.Error("expected Go in existing categories")
	}
	if !strings.Contains(prompt, "- Web") {
		t.Error("expected Web in existing categories")
	}
}

func Test_buildCategorizePrompt_NilTitle(t *testing.T) {
	id := uuid.New()
	articles := []domain.GeneratedContent{
		{ID: id, Title: nil, BodyMarkdown: nil},
	}

	prompt := buildCategorizePrompt(articles, nil)

	if !strings.Contains(prompt, "(no title)") {
		t.Error("expected fallback '(no title)' for nil title")
	}
	if !strings.Contains(prompt, id.String()) {
		t.Error("expected article ID in prompt")
	}
}

func Test_buildCategorizePrompt_NilBody(t *testing.T) {
	id := uuid.New()
	title := "Test Article"
	articles := []domain.GeneratedContent{
		{ID: id, Title: &title, BodyMarkdown: nil},
	}

	prompt := buildCategorizePrompt(articles, nil)

	if !strings.Contains(prompt, "Test Article") {
		t.Error("expected article title")
	}
	// Body should be empty, just the title line
	lines := strings.Split(prompt, "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "  ") && strings.TrimSpace(line) == "" {
			t.Error("should not have blank indented body line for nil body")
		}
	}
}

func Test_buildCategorizePrompt_LongBody(t *testing.T) {
	id := uuid.New()
	title := "Long Article"
	body := strings.Repeat("a", 1000)
	articles := []domain.GeneratedContent{
		{ID: id, Title: &title, BodyMarkdown: &body},
	}

	prompt := buildCategorizePrompt(articles, nil)

	// Body should be truncated to 500 chars + "..."
	expectedTruncated := strings.Repeat("a", 500) + "..."
	if !strings.Contains(prompt, expectedTruncated) {
		t.Error("expected body truncated to 500 chars with ellipsis")
	}
	// Full 1000-char body should NOT be in prompt
	if strings.Contains(prompt, strings.Repeat("a", 501)) {
		t.Error("body should be truncated to 500 chars")
	}
}

func Test_buildCategorizePrompt_EmptyArticles(t *testing.T) {
	prompt := buildCategorizePrompt(nil, nil)
	if !strings.Contains(prompt, "Articles:\n") {
		t.Error("expected 'Articles:' header even with no articles")
	}
}

func Test_buildCategorizePrompt_EmptyExistingCategories(t *testing.T) {
	title := "Test"
	articles := []domain.GeneratedContent{
		{ID: uuid.New(), Title: &title},
	}

	prompt := buildCategorizePrompt(articles, []string{})

	if strings.Contains(prompt, "Existing categories") {
		t.Error("should not mention existing categories when list is empty")
	}
}

func TestNewCategorizeService(t *testing.T) {
	userID := uuid.New()
	svc := NewCategorizeService(
		&mockLLM{},
		&mockCategorizer{},
		&mockCategorizeQueries{},
		userID,
	)

	if svc == nil {
		t.Fatal("expected non-nil service")
	}
	if svc.userID != userID {
		t.Errorf("expected userID %v, got %v", userID, svc.userID)
	}
	if svc.cheapLLM == nil {
		t.Error("expected cheapLLM to be set")
	}
	if svc.categorizer == nil {
		t.Error("expected categorizer to be set")
	}
}

func TestCategorizeService_Run_AddCategoryError(t *testing.T) {
	articleID := uuid.New()
	writer := &mockCategorizer{
		addCategoryErr: errors.New("category insert failed"),
	}
	svc := &CategorizeService{
		cheapLLM: &mockLLM{response: &domain.LLMResponse{
			Content: `{"` + articleID.String() + `": ["AI", "ML"]}`,
		}},
		categorizer:   writer,
		digestQueries: &mockCategorizeQueries{
			uncategorized: []domain.GeneratedContent{
				{ID: articleID, Title: lib.StrPtr("test")},
			},
		},
		userID: uuid.New(),
	}

	// Should log warning but not return error
	if err := svc.Run(context.Background()); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
