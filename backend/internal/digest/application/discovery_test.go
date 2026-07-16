package application

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
	"github.com/rodrigo-militao/forge/internal/lib"
	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

// --- Shared mocks for DiscoveryService ---

type mockLLM struct {
	response *domain.LLMResponse
	err      error
}

func (m *mockLLM) Complete(_ context.Context, _ domain.LLMRequest) (*domain.LLMResponse, error) {
	return m.response, m.err
}

type fakeSource struct {
	name     string
	articles []digest.SourceItem
	err      error
}

func (f *fakeSource) Name() string                                          { return f.name }
func (f *fakeSource) Fetch(_ context.Context) ([]digest.SourceItem, error)  { return f.articles, f.err }

type mockContentWriter struct {
	created    []*domain.GeneratedContent
	err        error
	failAfter  int // fail after N successful Create calls (0 = never fail by count)
	callCount  int
}

func (m *mockContentWriter) Create(_ context.Context, content *domain.GeneratedContent) error {
	m.callCount++
	m.created = append(m.created, content)
	if m.failAfter > 0 {
		if m.callCount >= m.failAfter {
			return m.err
		}
		return nil
	}
	// failAfter == 0: always return err (if set)
	return m.err
}
func (m *mockContentWriter) UpdateBody(_ context.Context, _ uuid.UUID, _, _ *string) error  { return nil }
func (m *mockContentWriter) UpdateOutline(_ context.Context, _ uuid.UUID, _ *string) error  { return nil }
func (m *mockContentWriter) UpdateStatus(_ context.Context, _ uuid.UUID, _ domain.ContentStatus) error { return nil }
func (m *mockContentWriter) SoftDelete(_ context.Context, _ uuid.UUID) error   { return nil }

type mockDigestQueries struct {
	existsByURL map[string]bool
	err         error
}

func (m *mockDigestQueries) ExistsByURL(_ context.Context, _ uuid.UUID, url string) (bool, error) {
	if m.existsByURL == nil {
		return false, m.err
	}
	exists, ok := m.existsByURL[url]
	if !ok {
		return false, m.err
	}
	return exists, m.err
}
func (m *mockDigestQueries) ListWithoutCategory(_ context.Context, _ uuid.UUID, _ int) ([]domain.GeneratedContent, error) {
	return nil, nil
}
func (m *mockDigestQueries) GetDigestStats(_ context.Context, _ uuid.UUID) (*ports.DigestStats, error) {
	return &ports.DigestStats{}, nil
}

// --- DiscoveryService tests ---

func TestNewDiscoveryService(t *testing.T) {
	userID := uuid.New()
	svc := NewDiscoveryService(
		&mockLLM{},
		[]digest.ContentSource{&fakeSource{name: "src1"}},
		&mockContentWriter{},
		&mockDigestQueries{},
		userID,
		[]string{"AI", "Go"},
	)

	if svc == nil {
		t.Fatal("expected non-nil service")
	}
	if svc.userID != userID {
		t.Errorf("expected userID %v, got %v", userID, svc.userID)
	}
	if len(svc.interestLabels) != 2 || svc.interestLabels[0] != "AI" {
		t.Errorf("expected interest labels [AI Go], got %v", svc.interestLabels)
	}
}

func TestDiscoveryService_Run_HappyPath(t *testing.T) {
	userID := uuid.New()
	llm := &mockLLM{
		response: &domain.LLMResponse{
			Content: "1 | HIGH | Real case with data\n2 | MEDIUM | Solid technical post\n",
		},
	}
	writer := &mockContentWriter{}
	sources := []digest.ContentSource{
		&fakeSource{
			name: "blog",
			articles: []digest.SourceItem{
				{Title: "Go Performance", URL: "https://example.com/1", Content: "Go performance tuning tips", SourceName: "Go Blog"},
				{Title: "Rust vs Go", URL: "https://example.com/2", Content: "Comparative analysis", SourceName: "Dev Blog"},
			},
		},
	}

	svc := &DiscoveryService{
		llm:            llm,
		sources:        sources,
		content:        writer,
		digestQueries:  &mockDigestQueries{},
		userID:         userID,
		interestLabels: nil,
	}

	result, err := svc.Run(context.Background(), time.Now())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.TotalArticles != 2 {
		t.Errorf("expected 2 total articles, got %d", result.TotalArticles)
	}
	if result.HighCount != 1 {
		t.Errorf("expected 1 high, got %d", result.HighCount)
	}
	if result.MediumCount != 1 {
		t.Errorf("expected 1 medium, got %d", result.MediumCount)
	}

	if len(writer.created) != 2 {
		t.Fatalf("expected 2 created content items, got %d", len(writer.created))
	}

	// Verify created content fields
	first := writer.created[0]
	if first.Product != domain.ProductDigest {
		t.Errorf("expected product digest, got %v", first.Product)
	}
	if first.Status != domain.ContentDraft {
		t.Errorf("expected status draft, got %v", first.Status)
	}
	if first.UserID != userID {
		t.Errorf("expected userID %v, got %v", userID, first.UserID)
	}
	if first.SourceType == nil || *first.SourceType != "discovery" {
		t.Errorf("expected source_type 'discovery', got %v", first.SourceType)
	}
	if first.Title == nil || *first.Title != "Go Performance" {
		t.Errorf("expected title 'Go Performance', got %v", first.Title)
	}
	if first.BodyMarkdown == nil || *first.BodyMarkdown != "Real case with data" {
		t.Errorf("expected summary 'Real case with data', got %v", first.BodyMarkdown)
	}

	// Verify metadata contains source URL and name
	var meta map[string]string
	if err := json.Unmarshal(first.Metadata, &meta); err != nil {
		t.Fatalf("failed to unmarshal metadata: %v", err)
	}
	if meta["source_url"] != "https://example.com/1" {
		t.Errorf("expected source_url 'https://example.com/1', got %s", meta["source_url"])
	}
	if meta["source_name"] != "Go Blog" {
		t.Errorf("expected source_name 'Go Blog', got %s", meta["source_name"])
	}
}

func TestDiscoveryService_Run_NoArticles(t *testing.T) {
	svc := &DiscoveryService{
		llm:           &mockLLM{},
		sources:       []digest.ContentSource{&fakeSource{name: "empty", articles: nil}},
		content:       &mockContentWriter{},
		digestQueries: &mockDigestQueries{},
		userID:        uuid.New(),
	}

	_, err := svc.Run(context.Background(), time.Now())
	if err == nil {
		t.Fatal("expected error for no articles, got nil")
	}
}

func TestDiscoveryService_Run_LLMError(t *testing.T) {
	svc := &DiscoveryService{
		llm: &mockLLM{err: errors.New("LLM unavailable")},
		sources: []digest.ContentSource{
			&fakeSource{
				name:     "blog",
				articles: []digest.SourceItem{{Title: "Test", URL: "https://example.com/1", Content: "test", SourceName: "Blog"}},
			},
		},
		content:       &mockContentWriter{},
		digestQueries: &mockDigestQueries{},
		userID:        uuid.New(),
	}

	_, err := svc.Run(context.Background(), time.Now())
	if err == nil {
		t.Fatal("expected error from LLM, got nil")
	}
}

func TestDiscoveryService_Run_NoHighMedium(t *testing.T) {
	llm := &mockLLM{
		response: &domain.LLMResponse{
			Content: "1 | LOW | Just opinion\n2 | LOW | Shallow news\n",
		},
	}
	writer := &mockContentWriter{}
	svc := &DiscoveryService{
		llm:     llm,
		sources: []digest.ContentSource{
			&fakeSource{
				name: "blog",
				articles: []digest.SourceItem{
					{Title: "Opinion", URL: "https://example.com/1", Content: "hot take", SourceName: "Blog"},
					{Title: "Shallow", URL: "https://example.com/2", Content: "news brief", SourceName: "Blog"},
				},
			},
		},
		content:       writer,
		digestQueries: &mockDigestQueries{},
		userID:        uuid.New(),
	}

	result, err := svc.Run(context.Background(), time.Now())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.TotalArticles != 2 {
		t.Errorf("expected 2 total articles, got %d", result.TotalArticles)
	}
	if result.HighCount != 0 {
		t.Errorf("expected 0 high, got %d", result.HighCount)
	}
	if result.MediumCount != 0 {
		t.Errorf("expected 0 medium, got %d", result.MediumCount)
	}
	if len(writer.created) != 0 {
		t.Errorf("expected 0 created items, got %d", len(writer.created))
	}
}

func TestDiscoveryService_Run_DedupURL(t *testing.T) {
	userID := uuid.New()
	llm := &mockLLM{
		response: &domain.LLMResponse{
			Content: "1 | HIGH | Great article\n",
		},
	}
	writer := &mockContentWriter{}
	queries := &mockDigestQueries{
		existsByURL: map[string]bool{"https://example.com/dup": true},
	}
	svc := &DiscoveryService{
		llm:     llm,
		sources: []digest.ContentSource{
			&fakeSource{
				name:     "blog",
				articles: []digest.SourceItem{{Title: "Dup", URL: "https://example.com/dup", Content: "content", SourceName: "Blog"}},
			},
		},
		content:       writer,
		digestQueries: queries,
		userID:        userID,
	}

	result, err := svc.Run(context.Background(), time.Now())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.HighCount != 1 {
		t.Errorf("expected 1 high classification, got %d", result.HighCount)
	}
	if len(writer.created) != 0 {
		t.Errorf("expected 0 persisted items (all deduped), got %d", len(writer.created))
	}
}

func TestDiscoveryService_Run_DedupCheckError(t *testing.T) {
	llm := &mockLLM{
		response: &domain.LLMResponse{
			Content: "1 | HIGH | Great article\n",
		},
	}
	writer := &mockContentWriter{}
	queries := &mockDigestQueries{
		err: errors.New("DB unavailable"),
	}
	svc := &DiscoveryService{
		llm:     llm,
		sources: []digest.ContentSource{
			&fakeSource{
				name:     "blog",
				articles: []digest.SourceItem{{Title: "Article", URL: "https://example.com/1", Content: "content", SourceName: "Blog"}},
			},
		},
		content:       writer,
		digestQueries: queries,
		userID:        uuid.New(),
	}

	_, err := svc.Run(context.Background(), time.Now())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(writer.created) != 1 {
		t.Errorf("expected 1 persisted item despite dedup error, got %d", len(writer.created))
	}
}

func TestDiscoveryService_Run_PersistError(t *testing.T) {
	llm := &mockLLM{
		response: &domain.LLMResponse{
			Content: "1 | HIGH | Great article\n",
		},
	}
	writer := &mockContentWriter{err: errors.New("DB write failed")}
	svc := &DiscoveryService{
		llm:     llm,
		sources: []digest.ContentSource{
			&fakeSource{
				name:     "blog",
				articles: []digest.SourceItem{{Title: "Article", URL: "https://example.com/1", Content: "content", SourceName: "Blog"}},
			},
		},
		content:       writer,
		digestQueries: &mockDigestQueries{},
		userID:        uuid.New(),
	}

	_, err := svc.Run(context.Background(), time.Now())
	if err == nil {
		t.Fatal("expected error from persist, got nil")
	}
}

func TestDiscoveryService_Run_PersistError_MediumLoop(t *testing.T) {
	llm := &mockLLM{
		response: &domain.LLMResponse{
			Content: "1 | HIGH | Great high article\n2 | MEDIUM | Solid medium post\n",
		},
	}
	// First Create call succeeds (high item), second fails (medium item)
	writer := &mockContentWriter{
		err:       errors.New("medium persist failed"),
		failAfter: 2,
	}
	svc := &DiscoveryService{
		llm:     llm,
		sources: []digest.ContentSource{
			&fakeSource{
				name: "blog",
				articles: []digest.SourceItem{
					{Title: "High Article", URL: "https://example.com/1", Content: "high content", SourceName: "Blog"},
					{Title: "Medium Article", URL: "https://example.com/2", Content: "medium content", SourceName: "Blog"},
				},
			},
		},
		content:       writer,
		digestQueries: &mockDigestQueries{},
		userID:        uuid.New(),
	}

	_, err := svc.Run(context.Background(), time.Now())
	if err == nil {
		t.Fatal("expected error from medium persist, got nil")
	}
}

func TestDiscoveryService_fetchFromSources(t *testing.T) {
	s1 := &fakeSource{
		name: "src1",
		articles: []digest.SourceItem{
			{Title: "A1", URL: "https://example.com/1", Content: "c1", SourceName: "S1"},
			{Title: "A2", URL: "https://example.com/2", Content: "c2", SourceName: "S1"},
		},
	}
	s2 := &fakeSource{
		name: "src2",
		articles: []digest.SourceItem{
			{Title: "A3", URL: "https://example.com/1", Content: "c3", SourceName: "S2"}, // dup with A1
			{Title: "A4", URL: "https://example.com/4", Content: "c4", SourceName: "S2"},
		},
	}

	svc := &DiscoveryService{
		sources: []digest.ContentSource{s1, s2},
		userID:  uuid.New(),
	}

	articles := svc.fetchFromSources(context.Background())
	if len(articles) != 3 {
		t.Fatalf("expected 3 articles (2 from s1 + 1 new from s2), got %d", len(articles))
	}
	// Verify dedup: "A1" (dup URL) should not appear, "A4" should be included
	titles := make(map[string]bool)
	for _, a := range articles {
		titles[a.Title] = true
	}
	if !titles["A1"] {
		t.Error("expected A1 from first source")
	}
	if !titles["A2"] {
		t.Error("expected A2 from first source")
	}
	if titles["A3"] {
		t.Error("A3 should be deduped (same URL as A1)")
	}
	if !titles["A4"] {
		t.Error("expected A4 from second source")
	}
}

func TestDiscoveryService_fetchFromSources_SourceError(t *testing.T) {
	s1 := &fakeSource{name: "failing", err: errors.New("network error")}
	s2 := &fakeSource{
		name:     "ok",
		articles: []digest.SourceItem{{Title: "OK", URL: "https://example.com/ok", Content: "content", SourceName: "OK"}},
	}

	svc := &DiscoveryService{
		sources: []digest.ContentSource{s1, s2},
		userID:  uuid.New(),
	}

	articles := svc.fetchFromSources(context.Background())
	if len(articles) != 1 {
		t.Fatalf("expected 1 article (only from working source), got %d", len(articles))
	}
	if articles[0].Title != "OK" {
		t.Errorf("expected title 'OK', got '%s'", articles[0].Title)
	}
}

func TestDiscoveryService_fetchFromSources_EmptyURL(t *testing.T) {
	s1 := &fakeSource{
		name: "src",
		articles: []digest.SourceItem{
			{Title: "NoURL", URL: "", Content: "c1", SourceName: "S"},
			{Title: "HasURL", URL: "https://example.com/u", Content: "c2", SourceName: "S"},
		},
	}

	svc := &DiscoveryService{
		sources: []digest.ContentSource{s1},
		userID:  uuid.New(),
	}

	articles := svc.fetchFromSources(context.Background())
	if len(articles) != 1 {
		t.Fatalf("expected 1 article (empty URL skipped), got %d", len(articles))
	}
	if articles[0].Title != "HasURL" {
		t.Errorf("expected title 'HasURL', got '%s'", articles[0].Title)
	}
}

func TestDiscoveryService_fetchFromSources_AllSourcesFail(t *testing.T) {
	s1 := &fakeSource{name: "fail1", err: errors.New("err1")}
	s2 := &fakeSource{name: "fail2", err: errors.New("err2")}

	svc := &DiscoveryService{
		sources: []digest.ContentSource{s1, s2},
		userID:  uuid.New(),
	}

	articles := svc.fetchFromSources(context.Background())
	if len(articles) != 0 {
		t.Errorf("expected 0 articles when all sources fail, got %d", len(articles))
	}
}

func Test_buildMetadata(t *testing.T) {
	item := digest.DigestItem{
		Title:      "Test",
		URL:        "https://example.com/test",
		SourceName: "Test Blog",
		Summary:    "A test article",
		Score:      5,
	}

	meta := buildMetadata(item)
	if meta == nil {
		t.Fatal("expected non-nil metadata")
	}

	var parsed map[string]string
	if err := json.Unmarshal(meta, &parsed); err != nil {
		t.Fatalf("failed to unmarshal metadata: %v", err)
	}
	if parsed["source_url"] != "https://example.com/test" {
		t.Errorf("expected source_url 'https://example.com/test', got '%s'", parsed["source_url"])
	}
	if parsed["source_name"] != "Test Blog" {
		t.Errorf("expected source_name 'Test Blog', got '%s'", parsed["source_name"])
	}
}

func Test_strPtr(t *testing.T) {
	s := lib.StrPtr("hello")
	if s == nil {
		t.Fatal("expected non-nil pointer")
	}
	if *s != "hello" {
		t.Errorf("expected 'hello', got '%s'", *s)
	}

	empty := lib.StrPtr("")
	if empty == nil {
		t.Fatal("expected non-nil pointer for empty string")
	}
	if *empty != "" {
		t.Errorf("expected empty string, got '%s'", *empty)
	}
}
