package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/application"
	"github.com/rodrigo-militao/forge/internal/core/domain"
)

// mockContentRepo implements ports.ContentRepository for testing.
type mockContentRepo struct {
	items []domain.GeneratedContent
}

func (m *mockContentRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.GeneratedContent, error) {
	for _, c := range m.items {
		if c.ID == id {
			return &c, nil
		}
	}
	return nil, domain.ErrNotFound
}
func (m *mockContentRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.GeneratedContent, error) {
	return m.items, nil
}
func (m *mockContentRepo) Create(ctx context.Context, content *domain.GeneratedContent) error { return nil }
func (m *mockContentRepo) UpdateBody(ctx context.Context, id uuid.UUID, title, body *string) error { return nil }
func (m *mockContentRepo) SoftDelete(ctx context.Context, id uuid.UUID) error {
	for i, c := range m.items {
		if c.ID == id {
			now := time.Now()
			m.items[i].DeletedAt = &now
			return nil
		}
	}
	return domain.ErrNotFound
}
func (m *mockContentRepo) UpdateCategory(ctx context.Context, id uuid.UUID, category *string) error {
	for i, c := range m.items {
		if c.ID == id {
			m.items[i].Category = category
			return nil
		}
	}
	return domain.ErrNotFound
}
func (m *mockContentRepo) ExistsByURL(ctx context.Context, userID uuid.UUID, url string) (bool, error) { return false, nil }
func (m *mockContentRepo) ListWithoutCategory(ctx context.Context, userID uuid.UUID, limit int) ([]domain.GeneratedContent, error) { return nil, nil }
func (m *mockContentRepo) ListUserCategories(ctx context.Context, userID uuid.UUID) ([]string, error) { return nil, nil }
func (m *mockContentRepo) AddTag(ctx context.Context, id uuid.UUID, tag string) error { return nil }
func (m *mockContentRepo) RemoveTag(ctx context.Context, id uuid.UUID, tag string) error { return nil }
func (m *mockContentRepo) ListUserTags(ctx context.Context, userID uuid.UUID) ([]string, error) { return nil, nil }

func TestContentHandler_List(t *testing.T) {
	uid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: uuid.New(), UserID: uid, Product: domain.ProductDigest, Title: strPtr("test")},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content)}

	r := httptest.NewRequest(http.MethodGet, "/api/content", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	var list []domain.GeneratedContent
	json.NewDecoder(w.Body).Decode(&list)
	if len(list) != 1 {
		t.Errorf("expected 1 item, got %d", len(list))
	}
}

func TestContentHandler_Delete_Owned(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content)}

	r := httptest.NewRequest(http.MethodDelete, "/api/content/"+cid.String(), nil)
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Delete(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestContentHandler_Delete_NotOwned(t *testing.T) {
	uid := uuid.New()
	otherID := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: otherID, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content)}

	r := httptest.NewRequest(http.MethodDelete, "/api/content/"+cid.String(), nil)
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Delete(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

func TestContentHandler_Delete_NotFound(t *testing.T) {
	uid := uuid.New()
	h := &ContentHandler{svc: application.NewContentService(&mockContentRepo{})}

	r := httptest.NewRequest(http.MethodDelete, "/api/content/"+uuid.New().String(), nil)
	r = addChiURLParam(r, "id", uuid.New().String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Delete(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestContentHandler_UpdateCategory(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content)}

	body := `{"category":"AI"}`
	r := httptest.NewRequest(http.MethodPut, "/api/content/"+cid.String()+"/category", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateCategory(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	// verify category was set
	for _, c := range content.items {
		if c.ID == cid {
			if c.Category == nil || *c.Category != "AI" {
				t.Errorf("expected category AI, got %v", c.Category)
			}
		}
	}
}

func strPtr(s string) *string { return &s }

// addChiURLParam adds a chi URL param to the request context for testing.
func addChiURLParam(r *http.Request, key, value string) *http.Request {
	chiCtx := chi.NewRouteContext()
	chiCtx.URLParams.Add(key, value)
	return r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, chiCtx))
}
