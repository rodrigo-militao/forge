package application

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// --- mocks ---

type mockContentRepo struct {
	content       *domain.GeneratedContent
	contents      []domain.GeneratedContent
	categories    []string
	tags          []string
	getByIDErr    error
	listByUserErr error
	updateBodyErr error
	updateOutlineErr error
	updateStatusErr   error
	softDeleteErr     error
	addCategoryErr    error
	removeCategoryErr error
	setCategoriesErr  error
	listCategoriesErr error
	addTagErr         error
	removeTagErr      error
	listTagsErr       error
}

func (m *mockContentRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.GeneratedContent, error) {
	return m.content, m.getByIDErr
}

func (m *mockContentRepo) Create(ctx context.Context, content *domain.GeneratedContent) error {
	return nil
}

func (m *mockContentRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.GeneratedContent, error) {
	return m.contents, m.listByUserErr
}

func (m *mockContentRepo) UpdateBody(ctx context.Context, id uuid.UUID, title, bodyMarkdown *string) error {
	return m.updateBodyErr
}

func (m *mockContentRepo) UpdateOutline(ctx context.Context, id uuid.UUID, outline *string) error {
	return m.updateOutlineErr
}

func (m *mockContentRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.ContentStatus) error {
	return m.updateStatusErr
}

func (m *mockContentRepo) SoftDelete(ctx context.Context, id uuid.UUID) error {
	return m.softDeleteErr
}

func (m *mockContentRepo) AddCategory(ctx context.Context, id uuid.UUID, category string) error {
	return m.addCategoryErr
}

func (m *mockContentRepo) RemoveCategory(ctx context.Context, id uuid.UUID, category string) error {
	return m.removeCategoryErr
}

func (m *mockContentRepo) SetCategories(ctx context.Context, id uuid.UUID, categories []string) error {
	return m.setCategoriesErr
}

func (m *mockContentRepo) ListUserCategories(ctx context.Context, userID uuid.UUID) ([]string, error) {
	return m.categories, m.listCategoriesErr
}

func (m *mockContentRepo) AddTag(ctx context.Context, id uuid.UUID, tag string) error {
	return m.addTagErr
}

func (m *mockContentRepo) RemoveTag(ctx context.Context, id uuid.UUID, tag string) error {
	return m.removeTagErr
}

func (m *mockContentRepo) ListUserTags(ctx context.Context, userID uuid.UUID) ([]string, error) {
	return m.tags, m.listTagsErr
}

func (m *mockContentRepo) ExistsByURL(ctx context.Context, userID uuid.UUID, url string) (bool, error) {
	return false, nil
}

func (m *mockContentRepo) ListWithoutCategory(ctx context.Context, userID uuid.UUID, limit int) ([]domain.GeneratedContent, error) {
	return nil, nil
}

func (m *mockContentRepo) GetDigestStats(ctx context.Context, userID uuid.UUID) (*ports.DigestStats, error) {
	return nil, nil
}

type mockSourceLinker struct {
	err error
}

func (m *mockSourceLinker) SetContentSource(ctx context.Context, contentID, sourceID uuid.UUID) error {
	return m.err
}

type mockUserRepo struct {
	user *domain.User
	err  error
}

func (m *mockUserRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	return m.user, m.err
}

// Unused interface methods — return zero values.
func (m *mockUserRepo) Create(ctx context.Context, user *domain.User) error { return nil }
func (m *mockUserRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) { return nil, nil }
func (m *mockUserRepo) CountActiveSources(ctx context.Context, userID uuid.UUID) (int, error) { return 0, nil }
func (m *mockUserRepo) CountActiveInterests(ctx context.Context, userID uuid.UUID) (int, error) { return 0, nil }
func (m *mockUserRepo) UpdateRestrictSearch(ctx context.Context, userID uuid.UUID, restrict bool) error { return nil }
func (m *mockUserRepo) UpdateThemePreference(ctx context.Context, userID uuid.UUID, theme domain.ThemePreference) error { return nil }

type mockUsageCounter struct {
	used int
	err  error
}

func (m *mockUsageCounter) Get(ctx context.Context, userID uuid.UUID, month string) (int, error) {
	return m.used, m.err
}

func (m *mockUsageCounter) Increment(ctx context.Context, userID uuid.UUID, month string) (int, error) {
	return 0, nil
}

// --- tests: ContentService ---

func TestNewContentService(t *testing.T) {
	s := NewContentService(&mockContentRepo{}, &mockSourceLinker{})
	if s == nil {
		t.Fatal("expected non-nil service")
	}
}

func TestGetOwnedContent_owned(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	svc := NewContentService(&mockContentRepo{
		content: &domain.GeneratedContent{ID: cid, UserID: uid},
	}, &mockSourceLinker{})

	got, err := svc.GetOwnedContent(context.Background(), cid, uid)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.ID != cid {
		t.Errorf("expected content ID %v, got %v", cid, got.ID)
	}
}

func TestGetOwnedContent_notOwned(t *testing.T) {
	uid := uuid.New()
	other := uuid.New()
	svc := NewContentService(&mockContentRepo{
		content: &domain.GeneratedContent{ID: uuid.New(), UserID: other},
	}, &mockSourceLinker{})

	_, err := svc.GetOwnedContent(context.Background(), uuid.New(), uid)
	if err == nil {
		t.Fatal("expected error for not-owned content")
	}
}

func TestGetOwnedContent_repoError(t *testing.T) {
	svc := NewContentService(&mockContentRepo{
		getByIDErr: errors.New("db down"),
	}, &mockSourceLinker{})

	_, err := svc.GetOwnedContent(context.Background(), uuid.New(), uuid.New())
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestListByUser(t *testing.T) {
	uid := uuid.New()
	svc := NewContentService(&mockContentRepo{
		contents: []domain.GeneratedContent{{ID: uuid.New(), UserID: uid}},
	}, &mockSourceLinker{})

	got, err := svc.ListByUser(context.Background(), uid)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 1 {
		t.Errorf("expected 1 item, got %d", len(got))
	}
}

func TestListByUser_error(t *testing.T) {
	svc := NewContentService(&mockContentRepo{
		listByUserErr: errors.New("db error"),
	}, &mockSourceLinker{})

	_, err := svc.ListByUser(context.Background(), uuid.New())
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestUpdateBody(t *testing.T) {
	svc := NewContentService(&mockContentRepo{}, &mockSourceLinker{})
	title := "New Title"
	body := "New Body"
	err := svc.UpdateBody(context.Background(), uuid.New(), &title, &body)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestUpdateBody_error(t *testing.T) {
	svc := NewContentService(&mockContentRepo{updateBodyErr: errors.New("update failed")}, &mockSourceLinker{})
	err := svc.UpdateBody(context.Background(), uuid.New(), nil, nil)
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestUpdateOutline(t *testing.T) {
	svc := NewContentService(&mockContentRepo{}, &mockSourceLinker{})
	outline := "Some outline"
	err := svc.UpdateOutline(context.Background(), uuid.New(), &outline)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestUpdateOutline_error(t *testing.T) {
	svc := NewContentService(&mockContentRepo{updateOutlineErr: errors.New("update failed")}, &mockSourceLinker{})
	err := svc.UpdateOutline(context.Background(), uuid.New(), nil)
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestLinkSource(t *testing.T) {
	svc := NewContentService(&mockContentRepo{}, &mockSourceLinker{})
	err := svc.LinkSource(context.Background(), uuid.New(), uuid.New())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestLinkSource_error(t *testing.T) {
	svc := NewContentService(&mockContentRepo{}, &mockSourceLinker{err: errors.New("link failed")})
	err := svc.LinkSource(context.Background(), uuid.New(), uuid.New())
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestUpdateStatus(t *testing.T) {
	svc := NewContentService(&mockContentRepo{}, &mockSourceLinker{})
	err := svc.UpdateStatus(context.Background(), uuid.New(), domain.ContentPublished)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestUpdateStatus_error(t *testing.T) {
	svc := NewContentService(&mockContentRepo{updateStatusErr: errors.New("update failed")}, &mockSourceLinker{})
	err := svc.UpdateStatus(context.Background(), uuid.New(), domain.ContentPublished)
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestSoftDelete(t *testing.T) {
	svc := NewContentService(&mockContentRepo{}, &mockSourceLinker{})
	err := svc.SoftDelete(context.Background(), uuid.New())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestSoftDelete_error(t *testing.T) {
	svc := NewContentService(&mockContentRepo{softDeleteErr: errors.New("delete failed")}, &mockSourceLinker{})
	err := svc.SoftDelete(context.Background(), uuid.New())
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestAddCategory(t *testing.T) {
	svc := NewContentService(&mockContentRepo{}, &mockSourceLinker{})
	err := svc.AddCategory(context.Background(), uuid.New(), "tech")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestRemoveCategory(t *testing.T) {
	svc := NewContentService(&mockContentRepo{}, &mockSourceLinker{})
	err := svc.RemoveCategory(context.Background(), uuid.New(), "tech")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestSetCategories(t *testing.T) {
	svc := NewContentService(&mockContentRepo{}, &mockSourceLinker{})
	err := svc.SetCategories(context.Background(), uuid.New(), []string{"tech", "ai"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestListCategories(t *testing.T) {
	svc := NewContentService(&mockContentRepo{
		categories: []string{"tech", "ai"},
	}, &mockSourceLinker{})
	got, err := svc.ListCategories(context.Background(), uuid.New())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 2 || got[0] != "tech" || got[1] != "ai" {
		t.Errorf("unexpected categories: %v", got)
	}
}

func TestAddTag(t *testing.T) {
	svc := NewContentService(&mockContentRepo{}, &mockSourceLinker{})
	err := svc.AddTag(context.Background(), uuid.New(), "golang")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestRemoveTag(t *testing.T) {
	svc := NewContentService(&mockContentRepo{}, &mockSourceLinker{})
	err := svc.RemoveTag(context.Background(), uuid.New(), "golang")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestListTags(t *testing.T) {
	svc := NewContentService(&mockContentRepo{
		tags: []string{"golang", "testing"},
	}, &mockSourceLinker{})
	got, err := svc.ListTags(context.Background(), uuid.New())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 2 || got[0] != "golang" || got[1] != "testing" {
		t.Errorf("unexpected tags: %v", got)
	}
}

// --- tests: Plans ---

func TestNewPlans(t *testing.T) {
	p := NewPlans(&mockUserRepo{})
	if p == nil {
		t.Fatal("expected non-nil plans")
	}
}

func TestCheckMonthGenerationQuota_underLimit(t *testing.T) {
	uid := uuid.New()
	p := NewPlans(&mockUserRepo{user: &domain.User{MaxMonthlyGenerations: 100}})
	uc := &mockUsageCounter{used: 50}
	err := p.CheckMonthGenerationQuota(context.Background(), uid, uc)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestCheckMonthGenerationQuota_atLimit(t *testing.T) {
	uid := uuid.New()
	p := NewPlans(&mockUserRepo{user: &domain.User{MaxMonthlyGenerations: 100}})
	uc := &mockUsageCounter{used: 99}
	err := p.CheckMonthGenerationQuota(context.Background(), uid, uc)
	if err != nil {
		t.Fatalf("unexpected error (99 < 100): %v", err)
	}
}

func TestCheckMonthGenerationQuota_exceeded(t *testing.T) {
	uid := uuid.New()
	p := NewPlans(&mockUserRepo{user: &domain.User{MaxMonthlyGenerations: 100}})
	uc := &mockUsageCounter{used: 100}
	err := p.CheckMonthGenerationQuota(context.Background(), uid, uc)
	if err == nil {
		t.Fatal("expected LimitError for exceeded quota")
	}
	var limitErr *LimitError
	if !errors.As(err, &limitErr) {
		t.Fatalf("expected *LimitError, got %T", err)
	}
	if limitErr.Name != "monthly_generation" {
		t.Errorf("expected name 'monthly_generation', got %s", limitErr.Name)
	}
	if limitErr.Limit != 100 {
		t.Errorf("expected limit 100, got %d", limitErr.Limit)
	}
	if limitErr.Current != 100 {
		t.Errorf("expected current 100, got %d", limitErr.Current)
	}
}

func TestCheckMonthGenerationQuota_usageCounterError(t *testing.T) {
	uid := uuid.New()
	p := NewPlans(&mockUserRepo{user: &domain.User{MaxMonthlyGenerations: 100}})
	// If usage counter returns an error, used defaults to 0 — should pass
	uc := &mockUsageCounter{err: errors.New("counter error")}
	err := p.CheckMonthGenerationQuota(context.Background(), uid, uc)
	if err != nil {
		t.Fatalf("expected no error when usage counter fails: %v", err)
	}
}

func TestCheckMonthGenerationQuota_userRepoError(t *testing.T) {
	uid := uuid.New()
	p := NewPlans(&mockUserRepo{err: errors.New("user not found")})
	uc := &mockUsageCounter{}
	err := p.CheckMonthGenerationQuota(context.Background(), uid, uc)
	if err == nil {
		t.Fatal("expected error from user repo")
	}
}

func TestCheckSourceLimit_underLimit(t *testing.T) {
	uid := uuid.New()
	p := NewPlans(&mockUserRepo{user: &domain.User{MaxActiveSources: 5}})
	err := p.CheckSourceLimit(context.Background(), uid, 3)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestCheckSourceLimit_exceeded(t *testing.T) {
	uid := uuid.New()
	p := NewPlans(&mockUserRepo{user: &domain.User{MaxActiveSources: 5}})
	err := p.CheckSourceLimit(context.Background(), uid, 5)
	if err == nil {
		t.Fatal("expected LimitError for exceeded source limit")
	}
	var limitErr *LimitError
	if !errors.As(err, &limitErr) {
		t.Fatalf("expected *LimitError, got %T", err)
	}
	if limitErr.Name != "max_active_sources" {
		t.Errorf("expected name 'max_active_sources', got %s", limitErr.Name)
	}
}

func TestCheckSourceLimit_userRepoError(t *testing.T) {
	uid := uuid.New()
	p := NewPlans(&mockUserRepo{err: errors.New("user not found")})
	err := p.CheckSourceLimit(context.Background(), uid, 1)
	if err == nil {
		t.Fatal("expected error from user repo")
	}
}

func TestCheckInterestLimit_underLimit(t *testing.T) {
	uid := uuid.New()
	p := NewPlans(&mockUserRepo{user: &domain.User{MaxActiveInterests: 10}})
	err := p.CheckInterestLimit(context.Background(), uid, 5)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestCheckInterestLimit_exceeded(t *testing.T) {
	uid := uuid.New()
	p := NewPlans(&mockUserRepo{user: &domain.User{MaxActiveInterests: 10}})
	err := p.CheckInterestLimit(context.Background(), uid, 10)
	if err == nil {
		t.Fatal("expected LimitError for exceeded interest limit")
	}
	var limitErr *LimitError
	if !errors.As(err, &limitErr) {
		t.Fatalf("expected *LimitError, got %T", err)
	}
}

func TestCheckInterestLimit_userRepoError(t *testing.T) {
	uid := uuid.New()
	p := NewPlans(&mockUserRepo{err: errors.New("user not found")})
	err := p.CheckInterestLimit(context.Background(), uid, 1)
	if err == nil {
		t.Fatal("expected error from user repo")
	}
}

// --- tests: LimitError ---

func TestLimitError_Error(t *testing.T) {
	e := &LimitError{Name: "monthly_generation", Limit: 100, Current: 100}
	msg := e.Error()
	if msg != "monthly_generation limit reached (100/100)" {
		t.Errorf("unexpected error message: %s", msg)
	}
}

func TestLimitError_Code(t *testing.T) {
	e := &LimitError{Name: "monthly_generation", Limit: 100, Current: 50}
	if code := e.Code(); code != "plan_limit" {
		t.Errorf("expected 'plan_limit', got %s", code)
	}
}
