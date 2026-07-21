package application

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

type mockRefRepo struct {
	ports.ReferenceRepository
	refs map[uuid.UUID]*domain.Reference
	err  error
}

func (m *mockRefRepo) GetByID(_ context.Context, id uuid.UUID) (*domain.Reference, error) {
	if m.err != nil {
		return nil, m.err
	}
	if m.refs != nil {
		if r, ok := m.refs[id]; ok {
			return r, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *mockRefRepo) ListByUser(_ context.Context, userID uuid.UUID) ([]domain.Reference, error) {
	if m.err != nil {
		return nil, m.err
	}
	var result []domain.Reference
	for _, r := range m.refs {
		if r.UserID == userID {
			result = append(result, *r)
		}
	}
	return result, nil
}

func (m *mockRefRepo) Create(_ context.Context, ref *domain.Reference) error {
	if m.err != nil {
		return m.err
	}
	ref.ID = uuid.New()
	if m.refs == nil {
		m.refs = make(map[uuid.UUID]*domain.Reference)
	}
	m.refs[ref.ID] = ref
	return nil
}

func (m *mockRefRepo) Update(_ context.Context, ref *domain.Reference) error {
	if m.err != nil {
		return m.err
	}
	if m.refs != nil {
		m.refs[ref.ID] = ref
		return nil
	}
	return domain.ErrNotFound
}

func (m *mockRefRepo) Delete(_ context.Context, id uuid.UUID) error {
	if m.err != nil {
		return m.err
	}
	delete(m.refs, id)
	return nil
}

func (m *mockRefRepo) AttachToIdea(_ context.Context, _, _ uuid.UUID) error { return nil }
func (m *mockRefRepo) DetachFromIdea(_ context.Context, _, _ uuid.UUID) error { return nil }
func (m *mockRefRepo) ListByIdea(_ context.Context, _ uuid.UUID) ([]domain.Reference, error) { return nil, nil }
func (m *mockRefRepo) AttachToContent(_ context.Context, _, _ uuid.UUID) error { return nil }
func (m *mockRefRepo) DetachFromContent(_ context.Context, _, _ uuid.UUID) error { return nil }
func (m *mockRefRepo) ListByContent(_ context.Context, _ uuid.UUID) ([]domain.Reference, error) { return nil, nil }

type mockRefIdea struct {
	ports.IdeaRepository
	ideas map[uuid.UUID]*domain.Idea
}

func (m *mockRefIdea) GetByID(_ context.Context, id uuid.UUID) (*domain.Idea, error) {
	if m.ideas != nil {
		if i, ok := m.ideas[id]; ok {
			return i, nil
		}
	}
	return nil, domain.ErrNotFound
}

type mockRefContent struct {
	ports.ContentRepository
	content map[uuid.UUID]*domain.GeneratedContent
}

func (m *mockRefContent) GetByID(_ context.Context, id uuid.UUID) (*domain.GeneratedContent, error) {
	if m.content != nil {
		if c, ok := m.content[id]; ok {
			return c, nil
		}
	}
	return nil, domain.ErrNotFound
}
func (m *mockRefContent) ExistsByURL(_ context.Context, _ uuid.UUID, _ string) (bool, error) { return false, nil }
func (m *mockRefContent) ListWithoutCategory(_ context.Context, _ uuid.UUID, _ int) ([]domain.GeneratedContent, error) { return nil, nil }
func (m *mockRefContent) GetDigestStats(_ context.Context, _ uuid.UUID) (*ports.DigestStats, error) { return &ports.DigestStats{}, nil }
func (m *mockRefContent) ListUserCategories(_ context.Context, _ uuid.UUID) ([]string, error) { return nil, nil }
func (m *mockRefContent) ListUserTags(_ context.Context, _ uuid.UUID) ([]string, error) { return nil, nil }
func (m *mockRefContent) AddCategory(_ context.Context, _ uuid.UUID, _ string) error { return nil }
func (m *mockRefContent) RemoveCategory(_ context.Context, _ uuid.UUID, _ string) error { return nil }
func (m *mockRefContent) SetCategories(_ context.Context, _ uuid.UUID, _ []string) error { return nil }
func (m *mockRefContent) AddTag(_ context.Context, _ uuid.UUID, _ string) error { return nil }
func (m *mockRefContent) RemoveTag(_ context.Context, _ uuid.UUID, _ string) error { return nil }
func (m *mockRefContent) Create(_ context.Context, _ *domain.GeneratedContent) error { return nil }
func (m *mockRefContent) UpdateBody(_ context.Context, _ uuid.UUID, _, _ *string) error { return nil }
func (m *mockRefContent) UpdateOutline(_ context.Context, _ uuid.UUID, _ *string) error { return nil }
func (m *mockRefContent) UpdateStatus(_ context.Context, _ uuid.UUID, _ domain.ContentStatus) error { return nil }
func (m *mockRefContent) UpdateStatusWithPublishedAt(_ context.Context, _ uuid.UUID, _ domain.ContentStatus) error { return nil }
func (m *mockRefContent) SoftDelete(_ context.Context, _ uuid.UUID) error { return nil }
func (m *mockRefContent) ListByUser(_ context.Context, _ uuid.UUID) ([]domain.GeneratedContent, error) { return nil, nil }
func (m *mockRefContent) ListByUserFiltered(_ context.Context, _ uuid.UUID, _, _ *string) ([]domain.GeneratedContent, error) { return nil, nil }

func refRepo(refs map[uuid.UUID]*domain.Reference) *mockRefRepo {
	return &mockRefRepo{refs: refs}
}

func TestReferenceService_CreateReference_HappyPath(t *testing.T) {
	svc := NewReferenceService(refRepo(nil), &mockRefIdea{}, &mockRefContent{})

	ref, err := svc.CreateReference(context.Background(), testUser, strPtr("https://example.com"), nil, nil, nil, domain.ReferenceTypeWebsite)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ref.ID == uuid.Nil {
		t.Error("expected ID to be set")
	}
	if ref.UserID != testUser {
		t.Errorf("expected user %v, got %v", testUser, ref.UserID)
	}
}

func TestReferenceService_CreateReference_InvalidURL(t *testing.T) {
	svc := NewReferenceService(refRepo(nil), &mockRefIdea{}, &mockRefContent{})

	_, err := svc.CreateReference(context.Background(), testUser, strPtr(""), nil, nil, nil, domain.ReferenceTypeWebsite)
	if err == nil {
		t.Fatal("expected error for empty URL")
	}
}

func TestReferenceService_Get_HappyPath(t *testing.T) {
	refID := uuid.New()
	svc := NewReferenceService(refRepo(map[uuid.UUID]*domain.Reference{
		refID: {ID: refID, UserID: testUser, URL: "https://example.com"},
	}), &mockRefIdea{}, &mockRefContent{})

	got, err := svc.GetReference(context.Background(), refID, testUser)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.URL != "https://example.com" {
		t.Errorf("expected URL, got %s", got.URL)
	}
}

func TestReferenceService_Get_NotFound(t *testing.T) {
	svc := NewReferenceService(refRepo(nil), &mockRefIdea{}, &mockRefContent{})
	_, err := svc.GetReference(context.Background(), uuid.New(), testUser)
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestReferenceService_Get_NotOwned(t *testing.T) {
	refID := uuid.New()
	svc := NewReferenceService(refRepo(map[uuid.UUID]*domain.Reference{
		refID: {ID: refID, UserID: otherUser, URL: "https://example.com"},
	}), &mockRefIdea{}, &mockRefContent{})

	_, err := svc.GetReference(context.Background(), refID, testUser)
	if err == nil {
		t.Fatal("expected error for not owned")
	}
}

func TestReferenceService_ListReferences(t *testing.T) {
	svc := NewReferenceService(refRepo(map[uuid.UUID]*domain.Reference{
		uuid.New(): {ID: uuid.New(), UserID: testUser},
		uuid.New(): {ID: uuid.New(), UserID: testUser},
	}), &mockRefIdea{}, &mockRefContent{})

	refs, err := svc.ListReferences(context.Background(), testUser)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(refs) != 2 {
		t.Errorf("expected 2 refs, got %d", len(refs))
	}
}

func TestReferenceService_UpdateReference_HappyPath(t *testing.T) {
	refID := uuid.New()
	svc := NewReferenceService(refRepo(map[uuid.UUID]*domain.Reference{
		refID: {ID: refID, UserID: testUser, URL: "https://old.com", ReferenceType: domain.ReferenceTypeWebsite},
	}), &mockRefIdea{}, &mockRefContent{})

	updated, err := svc.UpdateReference(context.Background(), refID, testUser, strPtr("https://new.com"), nil, nil, nil, domain.ReferenceTypeWebsite)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if updated.URL != "https://new.com" {
		t.Errorf("expected new URL, got %s", updated.URL)
	}
}

func TestReferenceService_DeleteReference_HappyPath(t *testing.T) {
	refID := uuid.New()
	svc := NewReferenceService(refRepo(map[uuid.UUID]*domain.Reference{
		refID: {ID: refID, UserID: testUser, URL: "https://example.com"},
	}), &mockRefIdea{}, &mockRefContent{})

	err := svc.DeleteReference(context.Background(), refID, testUser)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestReferenceService_DeleteReference_NotOwned(t *testing.T) {
	refID := uuid.New()
	svc := NewReferenceService(refRepo(map[uuid.UUID]*domain.Reference{
		refID: {ID: refID, UserID: otherUser, URL: "https://example.com"},
	}), &mockRefIdea{}, &mockRefContent{})

	err := svc.DeleteReference(context.Background(), refID, testUser)
	if err == nil {
		t.Fatal("expected error for not owned")
	}
}

func TestReferenceService_AttachRefToIdea_DualOwnership(t *testing.T) {
	refID := uuid.New()
	ideaID := uuid.New()
	svc := NewReferenceService(
		refRepo(map[uuid.UUID]*domain.Reference{refID: {ID: refID, UserID: testUser}}),
		&mockRefIdea{ideas: map[uuid.UUID]*domain.Idea{ideaID: {ID: ideaID, UserID: testUser}}},
		&mockRefContent{},
	)

	err := svc.AttachReferenceToIdea(context.Background(), ideaID, refID, testUser)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestReferenceService_AttachRefToIdea_RefNotOwned(t *testing.T) {
	refID := uuid.New()
	ideaID := uuid.New()
	svc := NewReferenceService(
		refRepo(map[uuid.UUID]*domain.Reference{refID: {ID: refID, UserID: otherUser}}),
		&mockRefIdea{ideas: map[uuid.UUID]*domain.Idea{ideaID: {ID: ideaID, UserID: testUser}}},
		&mockRefContent{},
	)

	err := svc.AttachReferenceToIdea(context.Background(), ideaID, refID, testUser)
	if err == nil {
		t.Fatal("expected error for ref not owned")
	}
}

func TestReferenceService_AttachRefToArticle_TypeCheck(t *testing.T) {
	refID := uuid.New()
	contentID := uuid.New()
	svc := NewReferenceService(
		refRepo(map[uuid.UUID]*domain.Reference{refID: {ID: refID, UserID: testUser}}),
		&mockRefIdea{},
		&mockRefContent{content: map[uuid.UUID]*domain.GeneratedContent{
			contentID: {ID: contentID, UserID: testUser, Type: domain.ContentTypeNewsletter},
		}},
	)

	err := svc.AttachReferenceToArticle(context.Background(), contentID, refID, testUser)
	if err == nil {
		t.Fatal("expected error for non-article content")
	}
}

func strPtr(s string) *string { return &s }
