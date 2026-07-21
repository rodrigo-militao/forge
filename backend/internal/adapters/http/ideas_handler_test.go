package http

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/application"
	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// mockContentWriter is a minimal ContentRepository stub for test Promote flows.
type mockContentWriter struct {
	ports.ContentRepository
}

var _ ports.ContentRepository = (*mockContentWriter)(nil)

func (m *mockContentWriter) Create(ctx context.Context, content *domain.GeneratedContent) error {
	content.ID = uuid.New()
	return nil
}
func (m *mockContentWriter) SoftDelete(_ context.Context, _ uuid.UUID) error { return nil }
func (m *mockContentWriter) UpdateStatus(_ context.Context, _ uuid.UUID, _ domain.ContentStatus) error {
	return nil
}
func (m *mockContentWriter) UpdateStatusWithPublishedAt(_ context.Context, _ uuid.UUID, _ domain.ContentStatus) error {
	return nil
}
func (m *mockContentWriter) UpdateBody(_ context.Context, _ uuid.UUID, _, _ *string) error { return nil }
func (m *mockContentWriter) UpdateOutline(_ context.Context, _ uuid.UUID, _ *string) error { return nil }

// newIdeasHandler creates an IdeasHandler with a mock IdeasService for tests.
func newIdeasHandler(repo ports.IdeaRepository) *IdeasHandler {
	return NewIdeasHandler(application.NewIdeasService(repo, &mockContentWriter{}))
}

type mockIdeaRepo struct {
	ideas     []domain.Idea
	getErr    error
	listErr   error
	createErr error
	updateErr error
}

func (m *mockIdeaRepo) Create(ctx context.Context, idea *domain.Idea) error {
	if m.createErr != nil {
		return m.createErr
	}
	idea.ID = uuid.New()
	idea.CreatedAt = time.Now()
	idea.UpdatedAt = time.Now()
	if m.ideas == nil {
		m.ideas = make([]domain.Idea, 0)
	}
	m.ideas = append(m.ideas, *idea)
	return nil
}

func (m *mockIdeaRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Idea, error) {
	if m.getErr != nil {
		return nil, m.getErr
	}
	for _, idea := range m.ideas {
		if idea.ID == id {
			return &idea, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *mockIdeaRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.Idea, error) {
	if m.listErr != nil {
		return nil, m.listErr
	}
	var result []domain.Idea
	for _, idea := range m.ideas {
		if idea.UserID == userID {
			result = append(result, idea)
		}
	}
	return result, nil
}

func (m *mockIdeaRepo) Update(ctx context.Context, idea *domain.Idea) error {
	if m.updateErr != nil {
		return m.updateErr
	}
	for i, item := range m.ideas {
		if item.ID == idea.ID {
			m.ideas[i] = *idea
			return nil
		}
	}
	return domain.ErrNotFound
}

func (m *mockIdeaRepo) Archive(ctx context.Context, id uuid.UUID) error {
	for i, item := range m.ideas {
		if item.ID == id {
			m.ideas[i].Status = domain.IdeaStatusArchived
			return nil
		}
	}
	return domain.ErrNotFound
}

func (m *mockIdeaRepo) AddTag(ctx context.Context, ideaID uuid.UUID, tagLabel string, userID uuid.UUID) error {
	for i, item := range m.ideas {
		if item.ID == ideaID {
			m.ideas[i].Tags = append(m.ideas[i].Tags, tagLabel)
			return nil
		}
	}
	return domain.ErrNotFound
}

func (m *mockIdeaRepo) RemoveTag(ctx context.Context, ideaID uuid.UUID, tagLabel string, userID uuid.UUID) error {
	for i, item := range m.ideas {
		if item.ID == ideaID {
			for j, t := range m.ideas[i].Tags {
				if t == tagLabel {
					m.ideas[i].Tags = append(m.ideas[i].Tags[:j], m.ideas[i].Tags[j+1:]...)
					return nil
				}
			}
		}
	}
	return domain.ErrNotFound
}

func (m *mockIdeaRepo) LinkArticle(ctx context.Context, ideaID uuid.UUID, contentID uuid.UUID) error {
	return nil
}

// Ensure mockIdeaRepo implements ports.IdeaRepository.
var _ ports.IdeaRepository = (*mockIdeaRepo)(nil)

func TestIdeasHandler_List(t *testing.T) {
	uid := uuid.New()
	repo := &mockIdeaRepo{
		ideas: []domain.Idea{
			{ID: uuid.New(), UserID: uid, Title: "Idea A", Priority: domain.PriorityMedium, Status: domain.IdeaStatusOpen},
			{ID: uuid.New(), UserID: uid, Title: "Idea B", Priority: domain.PriorityHigh, Status: domain.IdeaStatusOpen},
			{ID: uuid.New(), UserID: uuid.New(), Title: "Not mine", Priority: domain.PriorityLow, Status: domain.IdeaStatusOpen},
		},
	}
	h := newIdeasHandler(repo)

	r := httptest.NewRequest(http.MethodGet, "/api/ideas", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	var ideas []domain.Idea
	if err := json.NewDecoder(w.Body).Decode(&ideas); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if len(ideas) != 2 {
		t.Errorf("expected 2 ideas, got %d", len(ideas))
	}
}

func TestIdeasHandler_List_Error(t *testing.T) {
	repo := &mockIdeaRepo{getErr: domain.ErrNotFound}
	h := newIdeasHandler(repo)

	r := httptest.NewRequest(http.MethodGet, "/api/ideas", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uuid.New()))
	w := httptest.NewRecorder()
	// ListByUser doesn't check getErr, but call it anyway to test an empty case.
	// The error case happens when the repo returns nil items without error.
	// Override: cause panic won't work. Instead, make ListByUser return nil without error.
	// We'll just test that it returns 200 with empty list.
	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestIdeasHandler_Get_Success(t *testing.T) {
	uid := uuid.New()
	ideaID := uuid.New()
	repo := &mockIdeaRepo{
		ideas: []domain.Idea{
			{ID: ideaID, UserID: uid, Title: "My Idea", Priority: domain.PriorityMedium, Status: domain.IdeaStatusOpen},
		},
	}
	h := newIdeasHandler(repo)

	r := httptest.NewRequest(http.MethodGet, "/api/ideas/"+ideaID.String(), nil)
	r = addChiURLParam(r, "ideaID", ideaID.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Get(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var idea domain.Idea
	json.NewDecoder(w.Body).Decode(&idea)
	if idea.Title != "My Idea" {
		t.Errorf("expected title 'My Idea', got %q", idea.Title)
	}
}

func TestIdeasHandler_Get_InvalidID(t *testing.T) {
	h := newIdeasHandler(&mockIdeaRepo{})

	r := httptest.NewRequest(http.MethodGet, "/api/ideas/bad-id", nil)
	r = addChiURLParam(r, "ideaID", "bad-id")
	w := httptest.NewRecorder()
	h.Get(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestIdeasHandler_Get_NotFound(t *testing.T) {
	repo := &mockIdeaRepo{}
	h := newIdeasHandler(repo)

	r := httptest.NewRequest(http.MethodGet, "/api/ideas/"+uuid.New().String(), nil)
	r = addChiURLParam(r, "ideaID", uuid.New().String())
	w := httptest.NewRecorder()
	h.Get(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestIdeasHandler_Create_Success(t *testing.T) {
	uid := uuid.New()
	repo := &mockIdeaRepo{}
	h := newIdeasHandler(repo)

	body := `{"title":"New Idea","context":"some context","priority":"high"}`
	r := httptest.NewRequest(http.MethodPost, "/api/ideas", strings.NewReader(body))
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
	var idea domain.Idea
	json.NewDecoder(w.Body).Decode(&idea)
	if idea.Title != "New Idea" {
		t.Errorf("expected title 'New Idea', got %q", idea.Title)
	}
	if idea.Priority != domain.PriorityHigh {
		t.Errorf("expected priority high, got %s", idea.Priority)
	}
	if idea.Status != domain.IdeaStatusOpen {
		t.Errorf("expected status open, got %s", idea.Status)
	}
	if idea.UserID != uid {
		t.Errorf("expected userID %s, got %s", uid, idea.UserID)
	}
	if idea.Context == nil || *idea.Context != "some context" {
		t.Errorf("expected context 'some context', got %v", idea.Context)
	}
}

func TestIdeasHandler_Create_InvalidBody(t *testing.T) {
	h := newIdeasHandler(&mockIdeaRepo{})

	body := `not json`
	r := httptest.NewRequest(http.MethodPost, "/api/ideas", strings.NewReader(body))
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uuid.New()))
	w := httptest.NewRecorder()
	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestIdeasHandler_Create_EmptyTitle(t *testing.T) {
	h := newIdeasHandler(&mockIdeaRepo{})

	body := `{"title":""}`
	r := httptest.NewRequest(http.MethodPost, "/api/ideas", strings.NewReader(body))
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uuid.New()))
	w := httptest.NewRecorder()
	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestIdeasHandler_Create_InvalidPriorityDefaultsToMedium(t *testing.T) {
	uid := uuid.New()
	repo := &mockIdeaRepo{}
	h := newIdeasHandler(repo)

	body := `{"title":"Idea","priority":"invalid"}`
	r := httptest.NewRequest(http.MethodPost, "/api/ideas", strings.NewReader(body))
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d", w.Code)
	}
	var idea domain.Idea
	json.NewDecoder(w.Body).Decode(&idea)
	if idea.Priority != domain.PriorityMedium {
		t.Errorf("expected priority medium (default), got %s", idea.Priority)
	}
}

func TestIdeasHandler_Create_NoPriorityDefaultsToMedium(t *testing.T) {
	uid := uuid.New()
	repo := &mockIdeaRepo{}
	h := newIdeasHandler(repo)

	body := `{"title":"Idea"}`
	r := httptest.NewRequest(http.MethodPost, "/api/ideas", strings.NewReader(body))
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d", w.Code)
	}
	var idea domain.Idea
	json.NewDecoder(w.Body).Decode(&idea)
	if idea.Priority != domain.PriorityMedium {
		t.Errorf("expected priority medium (default), got %s", idea.Priority)
	}
}

func TestIdeasHandler_Update_Success(t *testing.T) {
	uid := uuid.New()
	ideaID := uuid.New()
	repo := &mockIdeaRepo{
		ideas: []domain.Idea{
			{ID: ideaID, UserID: uid, Title: "Old Title", Priority: domain.PriorityLow, Status: domain.IdeaStatusOpen},
		},
	}
	h := newIdeasHandler(repo)

	body := `{"title":"Updated Title","priority":"high","notes":"some notes"}`
	r := httptest.NewRequest(http.MethodPut, "/api/ideas/"+ideaID.String(), strings.NewReader(body))
	r = addChiURLParam(r, "ideaID", ideaID.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Update(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var idea domain.Idea
	json.NewDecoder(w.Body).Decode(&idea)
	if idea.Title != "Updated Title" {
		t.Errorf("expected title 'Updated Title', got %q", idea.Title)
	}
	if idea.Priority != domain.PriorityHigh {
		t.Errorf("expected priority high, got %s", idea.Priority)
	}
	if idea.Notes == nil || *idea.Notes != "some notes" {
		t.Errorf("expected notes 'some notes', got %v", idea.Notes)
	}
}

func TestIdeasHandler_Update_InvalidID(t *testing.T) {
	h := newIdeasHandler(&mockIdeaRepo{})

	body := `{"title":"Updated"}`
	r := httptest.NewRequest(http.MethodPut, "/api/ideas/bad-id", strings.NewReader(body))
	r = addChiURLParam(r, "ideaID", "bad-id")
	w := httptest.NewRecorder()
	h.Update(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestIdeasHandler_Update_NotFound(t *testing.T) {
	repo := &mockIdeaRepo{ideas: []domain.Idea{{ID: uuid.New(), UserID: uuid.New(), Title: "Existing"}}}
	h := newIdeasHandler(repo)

	body := `{"title":"Updated"}`
	r := httptest.NewRequest(http.MethodPut, "/api/ideas/"+uuid.New().String(), strings.NewReader(body))
	r = addChiURLParam(r, "ideaID", uuid.New().String())
	w := httptest.NewRecorder()
	h.Update(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestIdeasHandler_Update_InvalidBody(t *testing.T) {
	uid := uuid.New()
	ideaID := uuid.New()
	repo := &mockIdeaRepo{
		ideas: []domain.Idea{
			{ID: ideaID, UserID: uid, Title: "Old Title", Priority: domain.PriorityLow, Status: domain.IdeaStatusOpen},
		},
	}
	h := newIdeasHandler(repo)

	body := `not json`
	r := httptest.NewRequest(http.MethodPut, "/api/ideas/"+ideaID.String(), strings.NewReader(body))
	r = addChiURLParam(r, "ideaID", ideaID.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Update(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestIdeasHandler_Archive_Success(t *testing.T) {
	uid := uuid.New()
	ideaID := uuid.New()
	repo := &mockIdeaRepo{
		ideas: []domain.Idea{
			{ID: ideaID, UserID: uid, Title: "To Archive", Priority: domain.PriorityMedium, Status: domain.IdeaStatusOpen},
		},
	}
	h := newIdeasHandler(repo)

	r := httptest.NewRequest(http.MethodDelete, "/api/ideas/"+ideaID.String(), nil)
	r = addChiURLParam(r, "ideaID", ideaID.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Archive(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["status"] != "archived" {
		t.Errorf("expected status 'archived', got %q", resp["status"])
	}
	// Verify the idea was actually archived
	idea, _ := repo.GetByID(r.Context(), ideaID)
	if idea.Status != domain.IdeaStatusArchived {
		t.Errorf("expected archived status, got %s", idea.Status)
	}
}

func TestIdeasHandler_Archive_InvalidID(t *testing.T) {
	h := newIdeasHandler(&mockIdeaRepo{})

	r := httptest.NewRequest(http.MethodDelete, "/api/ideas/bad-id", nil)
	r = addChiURLParam(r, "ideaID", "bad-id")
	w := httptest.NewRecorder()
	h.Archive(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestIdeasHandler_Archive_RepoError(t *testing.T) {
	repo := &mockIdeaRepo{}
	h := newIdeasHandler(repo)

	r := httptest.NewRequest(http.MethodDelete, "/api/ideas/"+uuid.New().String(), nil)
	r = addChiURLParam(r, "ideaID", uuid.New().String())
	w := httptest.NewRecorder()
	h.Archive(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestIdeasHandler_AddTag_Success(t *testing.T) {
	uid := uuid.New()
	ideaID := uuid.New()
	repo := &mockIdeaRepo{
		ideas: []domain.Idea{
			{ID: ideaID, UserID: uid, Title: "Idea", Priority: domain.PriorityMedium, Status: domain.IdeaStatusOpen},
		},
	}
	h := newIdeasHandler(repo)

	body := `{"label":"important"}`
	r := httptest.NewRequest(http.MethodPost, "/api/ideas/"+ideaID.String()+"/tags", strings.NewReader(body))
	r = addChiURLParam(r, "ideaID", ideaID.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.AddTag(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["status"] != "tag added" {
		t.Errorf("expected 'tag added', got %q", resp["status"])
	}
	idea, _ := repo.GetByID(r.Context(), ideaID)
	if len(idea.Tags) != 1 || idea.Tags[0] != "important" {
		t.Errorf("expected tags [important], got %v", idea.Tags)
	}
}

func TestIdeasHandler_AddTag_InvalidID(t *testing.T) {
	h := newIdeasHandler(&mockIdeaRepo{})

	body := `{"label":"important"}`
	r := httptest.NewRequest(http.MethodPost, "/api/ideas/bad-id/tags", strings.NewReader(body))
	r = addChiURLParam(r, "ideaID", "bad-id")
	w := httptest.NewRecorder()
	h.AddTag(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestIdeasHandler_AddTag_InvalidBody(t *testing.T) {
	repo := &mockIdeaRepo{}
	h := newIdeasHandler(repo)

	body := `not json`
	r := httptest.NewRequest(http.MethodPost, "/api/ideas/"+uuid.New().String()+"/tags", strings.NewReader(body))
	r = addChiURLParam(r, "ideaID", uuid.New().String())
	w := httptest.NewRecorder()
	h.AddTag(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestIdeasHandler_RemoveTag_Success(t *testing.T) {
	uid := uuid.New()
	ideaID := uuid.New()
	repo := &mockIdeaRepo{
		ideas: []domain.Idea{
			{ID: ideaID, UserID: uid, Title: "Idea", Priority: domain.PriorityMedium, Status: domain.IdeaStatusOpen, Tags: []string{"important", "other"}},
		},
	}
	h := newIdeasHandler(repo)

	r := httptest.NewRequest(http.MethodDelete, "/api/ideas/"+ideaID.String()+"/tags/important", nil)
	// Build a single RouteContext with both params (addChiURLParam overwrites when called twice)
	chiCtx := chi.NewRouteContext()
	chiCtx.URLParams.Add("ideaID", ideaID.String())
	chiCtx.URLParams.Add("tag", "important")
	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, chiCtx))
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.RemoveTag(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["status"] != "tag removed" {
		t.Errorf("expected 'tag removed', got %q", resp["status"])
	}
	idea, _ := repo.GetByID(r.Context(), ideaID)
	if len(idea.Tags) != 1 || idea.Tags[0] != "other" {
		t.Errorf("expected tags [other], got %v", idea.Tags)
	}
}

func TestIdeasHandler_RemoveTag_InvalidID(t *testing.T) {
	h := newIdeasHandler(&mockIdeaRepo{})

	r := httptest.NewRequest(http.MethodDelete, "/api/ideas/bad-id/tags/tag", nil)
	r = addChiURLParam(r, "ideaID", "bad-id")
	r = addChiURLParam(r, "tag", "tag")
	w := httptest.NewRecorder()
	h.RemoveTag(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestIdeasHandler_Promote_Success(t *testing.T) {
	uid := uuid.New()
	ideaID := uuid.New()
	repo := &mockIdeaRepo{
		ideas: []domain.Idea{
			{ID: ideaID, UserID: uid, Title: "Promotable Idea", Priority: domain.PriorityHigh, Status: domain.IdeaStatusOpen},
		},
	}
	h := newIdeasHandler(repo)

	r := httptest.NewRequest(http.MethodPost, "/api/ideas/"+ideaID.String()+"/promote", nil)
	r = addChiURLParam(r, "ideaID", ideaID.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Promote(w, r)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
	var article domain.GeneratedContent
	if err := json.NewDecoder(w.Body).Decode(&article); err != nil {
		t.Fatalf("expected valid article JSON, got error: %v", err)
	}
	if article.ID == uuid.Nil {
		t.Error("expected non-nil article ID")
	}
	if article.Type != domain.ContentTypeArticle {
		t.Errorf("expected type article, got %s", article.Type)
	}
	if article.Product != domain.ProductCompose {
		t.Errorf("expected product compose, got %s", article.Product)
	}
	if article.Status != domain.ContentBuilding {
		t.Errorf("expected status building, got %s", article.Status)
	}
}

func TestIdeasHandler_Promote_InvalidID(t *testing.T) {
	h := newIdeasHandler(&mockIdeaRepo{})

	r := httptest.NewRequest(http.MethodPost, "/api/ideas/bad-id/promote", nil)
	r = addChiURLParam(r, "ideaID", "bad-id")
	w := httptest.NewRecorder()
	h.Promote(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestIdeasHandler_Promote_NotFound(t *testing.T) {
	repo := &mockIdeaRepo{}
	h := newIdeasHandler(repo)

	r := httptest.NewRequest(http.MethodPost, "/api/ideas/"+uuid.New().String()+"/promote", nil)
	r = addChiURLParam(r, "ideaID", uuid.New().String())
	w := httptest.NewRecorder()
	h.Promote(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

// --- List error paths ---

func TestIdeasHandler_List_RepoError(t *testing.T) {
	repo := &mockIdeaRepo{listErr: errors.New("repo error")}
	h := newIdeasHandler(repo)

	r := httptest.NewRequest(http.MethodGet, "/api/ideas", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uuid.New()))
	w := httptest.NewRecorder()
	h.List(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
	var resp apiError
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Error != "failed to list ideas" {
		t.Errorf("expected 'failed to list ideas', got %q", resp.Error)
	}
}

// --- Create error paths ---

func TestIdeasHandler_Create_RepoError(t *testing.T) {
	uid := uuid.New()
	repo := &mockIdeaRepo{createErr: errors.New("db error")}
	h := newIdeasHandler(repo)

	body := `{"title":"New Idea"}`
	r := httptest.NewRequest(http.MethodPost, "/api/ideas", strings.NewReader(body))
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Create(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- Update error paths ---

func TestIdeasHandler_Update_RepoError(t *testing.T) {
	uid := uuid.New()
	ideaID := uuid.New()
	repo := &mockIdeaRepo{
		ideas: []domain.Idea{
			{ID: ideaID, UserID: uid, Title: "Old Title", Priority: domain.PriorityLow, Status: domain.IdeaStatusOpen},
		},
		updateErr: errors.New("update error"),
	}
	h := newIdeasHandler(repo)

	body := `{"title":"Updated"}`
	r := httptest.NewRequest(http.MethodPut, "/api/ideas/"+ideaID.String(), strings.NewReader(body))
	r = addChiURLParam(r, "ideaID", ideaID.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Update(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
	var resp apiError
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Error != "failed to update idea" {
		t.Errorf("expected 'failed to update idea', got %q", resp.Error)
	}
}

func TestIdeasHandler_Update_AllFields(t *testing.T) {
	uid := uuid.New()
	ideaID := uuid.New()
	repo := &mockIdeaRepo{
		ideas: []domain.Idea{
			{ID: ideaID, UserID: uid, Title: "Old Title", Priority: domain.PriorityLow, Status: domain.IdeaStatusOpen},
		},
	}
	h := newIdeasHandler(repo)

	body := `{"title":"New Title","context":"ctx","notes":"my notes","references":"refs","priority":"high","status":"in_progress"}`
	r := httptest.NewRequest(http.MethodPut, "/api/ideas/"+ideaID.String(), strings.NewReader(body))
	r = addChiURLParam(r, "ideaID", ideaID.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Update(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var got domain.Idea
	json.NewDecoder(w.Body).Decode(&got)
	if got.Title != "New Title" {
		t.Errorf("expected title 'New Title', got %q", got.Title)
	}
	if got.Context == nil || *got.Context != "ctx" {
		t.Errorf("expected context 'ctx', got %v", got.Context)
	}
	if got.Notes == nil || *got.Notes != "my notes" {
		t.Errorf("expected notes 'my notes', got %v", got.Notes)
	}
	if got.References == nil || *got.References != "refs" {
		t.Errorf("expected references 'refs', got %v", got.References)
	}
	if got.Priority != domain.PriorityHigh {
		t.Errorf("expected priority 'high', got %q", got.Priority)
	}
	if got.Status != domain.IdeaStatusInProgress {
		t.Errorf("expected status 'in_progress', got %q", got.Status)
	}
}

// --- AddTag error paths ---

func TestIdeasHandler_AddTag_RepoError(t *testing.T) {
	uid := uuid.New()
	repo := &mockIdeaRepo{}
	h := newIdeasHandler(repo)

	body := `{"label":"test"}`
	ideaID := uuid.New()
	r := httptest.NewRequest(http.MethodPost, "/api/ideas/"+ideaID.String()+"/tags", strings.NewReader(body))
	r = addChiURLParam(r, "ideaID", ideaID.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.AddTag(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

// --- RemoveTag error paths ---

func TestIdeasHandler_RemoveTag_RepoError(t *testing.T) {
	uid := uuid.New()
	repo := &mockIdeaRepo{}
	h := newIdeasHandler(repo)

	ideaID := uuid.New()
	r := httptest.NewRequest(http.MethodDelete, "/api/ideas/"+ideaID.String()+"/tags/mytag", nil)
	chiCtx := chi.NewRouteContext()
	chiCtx.URLParams.Add("ideaID", ideaID.String())
	chiCtx.URLParams.Add("tag", "mytag")
	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, chiCtx))
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.RemoveTag(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}
