package application

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

type mockIdeaRepo struct {
	ports.IdeaRepository
	ideas map[uuid.UUID]*domain.Idea
	getFn func(ctx context.Context, id uuid.UUID) (*domain.Idea, error)
}

func (m *mockIdeaRepo) GetByID(_ context.Context, id uuid.UUID) (*domain.Idea, error) {
	if m.getFn != nil {
		return m.getFn(context.Background(), id)
	}
	if m.ideas != nil {
		if i, ok := m.ideas[id]; ok {
			return i, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *mockIdeaRepo) ListByUser(_ context.Context, userID uuid.UUID) ([]domain.Idea, error) {
	var result []domain.Idea
	for _, i := range m.ideas {
		if i.UserID == userID {
			result = append(result, *i)
		}
	}
	return result, nil
}

func (m *mockIdeaRepo) Create(_ context.Context, idea *domain.Idea) error {
	if idea.ID == uuid.Nil {
		idea.ID = uuid.New()
	}
	if m.ideas == nil {
		m.ideas = make(map[uuid.UUID]*domain.Idea)
	}
	m.ideas[idea.ID] = idea
	return nil
}

func (m *mockIdeaRepo) Update(_ context.Context, idea *domain.Idea) error {
	if m.ideas != nil {
		m.ideas[idea.ID] = idea
	}
	return nil
}

func (m *mockIdeaRepo) Archive(_ context.Context, id uuid.UUID) error {
	if m.ideas != nil {
		if i, ok := m.ideas[id]; ok {
			i.Status = domain.IdeaStatusArchived
			return nil
		}
	}
	return domain.ErrNotFound
}

func (m *mockIdeaRepo) AddTag(_ context.Context, id uuid.UUID, _ string, _ uuid.UUID) error {
	if m.ideas != nil {
		if _, ok := m.ideas[id]; ok {
			return nil
		}
	}
	return domain.ErrNotFound
}

func (m *mockIdeaRepo) LinkArticle(_ context.Context, _, _ uuid.UUID) error { return nil }

func (m *mockIdeaRepo) RemoveTag(_ context.Context, id uuid.UUID, _ string, _ uuid.UUID) error {
	if m.ideas != nil {
		if _, ok := m.ideas[id]; ok {
			return nil
		}
	}
	return domain.ErrNotFound
}

type mockPromoteContent struct {
	ports.ContentRepository
	created []*domain.GeneratedContent
	createFn func(ctx context.Context, content *domain.GeneratedContent) error
}

func (m *mockPromoteContent) Create(_ context.Context, content *domain.GeneratedContent) error {
	if m.createFn != nil {
		return m.createFn(context.Background(), content)
	}
	content.ID = uuid.New()
	content.UserID = content.UserID
	content.Status = domain.ContentBuilding
	m.created = append(m.created, content)
	return nil
}

func (m *mockPromoteContent) SoftDelete(_ context.Context, _ uuid.UUID) error { return nil }

var testUser = uuid.MustParse("00000000-0000-0000-0000-000000000001")
var otherUser = uuid.MustParse("00000000-0000-0000-0000-000000000002")

func TestIdeasService_PromoteToArticle_HappyPath(t *testing.T) {
	ideaID := uuid.New()
	repo := &mockIdeaRepo{
		ideas: map[uuid.UUID]*domain.Idea{
			ideaID: {ID: ideaID, UserID: testUser, Title: "Test Idea", Status: domain.IdeaStatusOpen},
		},
	}
	content := &mockPromoteContent{}
	svc := NewIdeasService(repo, content)

	article, err := svc.PromoteToArticle(context.Background(), ideaID, testUser)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if article.ID == uuid.Nil {
		t.Error("expected article ID to be set")
	}
	if len(content.created) != 1 {
		t.Fatalf("expected 1 created article, got %d", len(content.created))
	}
}

func TestIdeasService_PromoteToArticle_NotFound(t *testing.T) {
	repo := &mockIdeaRepo{}
	content := &mockPromoteContent{}
	svc := NewIdeasService(repo, content)

	_, err := svc.PromoteToArticle(context.Background(), uuid.New(), testUser)
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestIdeasService_PromoteToArticle_NotOwned(t *testing.T) {
	ideaID := uuid.New()
	repo := &mockIdeaRepo{
		ideas: map[uuid.UUID]*domain.Idea{
			ideaID: {ID: ideaID, UserID: otherUser, Title: "Test Idea"},
		},
	}
	content := &mockPromoteContent{}
	svc := NewIdeasService(repo, content)

	_, err := svc.PromoteToArticle(context.Background(), ideaID, testUser)
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestIdeasService_List(t *testing.T) {
	repo := &mockIdeaRepo{
		ideas: map[uuid.UUID]*domain.Idea{
			uuid.New(): {ID: uuid.New(), UserID: testUser},
			uuid.New(): {ID: uuid.New(), UserID: testUser},
		},
	}
	content := &mockPromoteContent{}
	svc := NewIdeasService(repo, content)

	ideas, err := svc.List(context.Background(), testUser)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(ideas) != 2 {
		t.Errorf("expected 2 ideas, got %d", len(ideas))
	}
}

func TestIdeasService_Get(t *testing.T) {
	ideaID := uuid.New()
	repo := &mockIdeaRepo{
		ideas: map[uuid.UUID]*domain.Idea{
			ideaID: {ID: ideaID, UserID: testUser, Title: "My Idea"},
		},
	}
	svc := NewIdeasService(repo, &mockPromoteContent{})

	idea, err := svc.Get(context.Background(), ideaID, testUser)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if idea.Title != "My Idea" {
		t.Errorf("expected 'My Idea', got %q", idea.Title)
	}
}

func TestIdeasService_Get_NotFound(t *testing.T) {
	svc := NewIdeasService(&mockIdeaRepo{}, &mockPromoteContent{})
	_, err := svc.Get(context.Background(), uuid.New(), testUser)
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestIdeasService_Get_NotOwned(t *testing.T) {
	ideaID := uuid.New()
	repo := &mockIdeaRepo{
		ideas: map[uuid.UUID]*domain.Idea{
			ideaID: {ID: ideaID, UserID: otherUser},
		},
	}
	svc := NewIdeasService(repo, &mockPromoteContent{})

	_, err := svc.Get(context.Background(), ideaID, testUser)
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestIdeasService_Create(t *testing.T) {
	svc := NewIdeasService(&mockIdeaRepo{}, &mockPromoteContent{})
	idea := &domain.Idea{UserID: testUser, Title: "New Idea"}

	err := svc.Create(context.Background(), idea)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if idea.ID == uuid.Nil {
		t.Error("expected ID to be set")
	}
}

func TestIdeasService_Update_NotOwned(t *testing.T) {
	ideaID := uuid.New()
	repo := &mockIdeaRepo{
		ideas: map[uuid.UUID]*domain.Idea{
			ideaID: {ID: ideaID, UserID: otherUser},
		},
	}
	svc := NewIdeasService(repo, &mockPromoteContent{})

	err := svc.Update(context.Background(), &domain.Idea{ID: ideaID, Title: "Hacked"}, testUser)
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestIdeasService_Archive(t *testing.T) {
	ideaID := uuid.New()
	repo := &mockIdeaRepo{
		ideas: map[uuid.UUID]*domain.Idea{
			ideaID: {ID: ideaID, UserID: testUser, Status: domain.IdeaStatusOpen},
		},
	}
	svc := NewIdeasService(repo, &mockPromoteContent{})

	err := svc.Archive(context.Background(), ideaID, testUser)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if repo.ideas[ideaID].Status != domain.IdeaStatusArchived {
		t.Error("expected status to be archived")
	}
}

func TestIdeasService_AppendTag(t *testing.T) {
	ideaID := uuid.New()
	repo := &mockIdeaRepo{
		ideas: map[uuid.UUID]*domain.Idea{
			ideaID: {ID: ideaID, UserID: testUser},
		},
	}
	svc := NewIdeasService(repo, &mockPromoteContent{})

	err := svc.AddTag(context.Background(), ideaID, testUser, "test-tag")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestIdeasService_RemoveTag(t *testing.T) {
	ideaID := uuid.New()
	repo := &mockIdeaRepo{
		ideas: map[uuid.UUID]*domain.Idea{
			ideaID: {ID: ideaID, UserID: testUser},
		},
	}
	svc := NewIdeasService(repo, &mockPromoteContent{})

	err := svc.RemoveTag(context.Background(), ideaID, testUser, "test-tag")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
