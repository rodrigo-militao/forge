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
	"github.com/rodrigo-militao/forge/internal/lib"
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
func (m *mockContentRepo) UpdateOutline(ctx context.Context, id uuid.UUID, outline *string) error { return nil }

type mockSourceLinker struct{}

func (m *mockSourceLinker) SetContentSource(ctx context.Context, contentID, sourceID uuid.UUID) error { return nil }
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
func (m *mockContentRepo) AddCategory(ctx context.Context, id uuid.UUID, category string) error {
	for i, c := range m.items {
		if c.ID == id {
			m.items[i].Categories = append(m.items[i].Categories, category)
			return nil
		}
	}
	return domain.ErrNotFound
}
func (m *mockContentRepo) RemoveCategory(ctx context.Context, id uuid.UUID, category string) error {
	for i, c := range m.items {
		if c.ID == id {
			for j, cat := range m.items[i].Categories {
				if cat == category {
					m.items[i].Categories = append(m.items[i].Categories[:j], m.items[i].Categories[j+1:]...)
					return nil
				}
			}
		}
	}
	return domain.ErrNotFound
}
func (m *mockContentRepo) SetCategories(ctx context.Context, id uuid.UUID, categories []string) error {
	for i, c := range m.items {
		if c.ID == id {
			m.items[i].Categories = categories
			return nil
		}
	}
	return domain.ErrNotFound
}
func (m *mockContentRepo) GetDigestStats(ctx context.Context, userID uuid.UUID) (*ports.DigestStats, error) {
	return &ports.DigestStats{}, nil
}
func (m *mockContentRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.ContentStatus) error {
	for i, c := range m.items {
		if c.ID == id {
			m.items[i].Status = status
			return nil
		}
	}
	return domain.ErrNotFound
}
func (m *mockContentRepo) UpdateStatusWithPublishedAt(ctx context.Context, id uuid.UUID, status domain.ContentStatus) error {
	return m.UpdateStatus(ctx, id, status)
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
			{ID: uuid.New(), UserID: uid, Product: domain.ProductDigest, Title: lib.StrPtr("test")},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

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
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

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
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

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
	h := &ContentHandler{svc: application.NewContentService(&mockContentRepo{}, &mockContentRepo{}, &mockContentRepo{}, &mockContentRepo{}, &mockSourceLinker{})}

	r := httptest.NewRequest(http.MethodDelete, "/api/content/"+uuid.New().String(), nil)
	r = addChiURLParam(r, "id", uuid.New().String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Delete(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestContentHandler_UpdateCategories(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `{"categories":["AI","Web"]}`
	r := httptest.NewRequest(http.MethodPut, "/api/content/"+cid.String()+"/categories", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateCategories(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	for _, c := range content.items {
		if c.ID == cid {
			if len(c.Categories) != 2 || c.Categories[0] != "AI" || c.Categories[1] != "Web" {
				t.Errorf("expected categories [AI Web], got %v", c.Categories)
			}
		}
	}
}

func TestContentHandler_UpdateStatus(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest, Status: domain.ContentReady},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `{"status":"published"}`
	r := httptest.NewRequest(http.MethodPut, "/api/content/"+cid.String()+"/status", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateStatus(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	for _, c := range content.items {
		if c.ID == cid && c.Status != domain.ContentPublished {
			t.Errorf("expected status published, got %s", c.Status)
		}
	}
}

func TestContentHandler_UpdateStatus_Invalid(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest, Status: domain.ContentDraft},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `{"status":"invalid"}`
	r := httptest.NewRequest(http.MethodPut, "/api/content/"+cid.String()+"/status", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateStatus(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestContentHandler_UpdateStatus_NotOwned(t *testing.T) {
	uid := uuid.New()
	otherID := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: otherID, Product: domain.ProductDigest, Status: domain.ContentDraft},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `{"status":"published"}`
	r := httptest.NewRequest(http.MethodPut, "/api/content/"+cid.String()+"/status", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateStatus(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

func TestContentHandler_UpdateStatus_NotFound(t *testing.T) {
	uid := uuid.New()
	h := &ContentHandler{svc: application.NewContentService(&mockContentRepo{}, &mockContentRepo{}, &mockContentRepo{}, &mockContentRepo{}, &mockSourceLinker{})}

	body := `{"status":"published"}`
	r := httptest.NewRequest(http.MethodPut, "/api/content/"+uuid.New().String()+"/status", strings.NewReader(body))
	r = addChiURLParam(r, "id", uuid.New().String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateStatus(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

// addChiURLParam adds a chi URL param to the request context for testing.
// Supports multiple params — reuses an existing chi route context if present.
func addChiURLParam(r *http.Request, key, value string) *http.Request {
	chiCtx, ok := r.Context().Value(chi.RouteCtxKey).(*chi.Context)
	if !ok {
		chiCtx = chi.NewRouteContext()
	}
	chiCtx.URLParams.Add(key, value)
	return r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, chiCtx))
}

// ============================================================
// Save (PUT /api/content/{id})
// ============================================================

func TestContentHandler_Save(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `{"title":"New Title","body_markdown":"New Body"}`
	r := httptest.NewRequest(http.MethodPut, "/api/content/"+cid.String(), strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Save(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["status"] != "saved" {
		t.Errorf(`expected status "saved", got %q`, resp["status"])
	}
}

func TestContentHandler_Save_InvalidBody(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `{invalid json`
	r := httptest.NewRequest(http.MethodPut, "/api/content/"+cid.String(), strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Save(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestContentHandler_Save_NotFound(t *testing.T) {
	uid := uuid.New()
	h := &ContentHandler{svc: application.NewContentService(&mockContentRepo{}, &mockContentRepo{}, &mockContentRepo{}, &mockContentRepo{}, &mockSourceLinker{})}

	body := `{"title":"test"}`
	r := httptest.NewRequest(http.MethodPut, "/api/content/"+uuid.New().String(), strings.NewReader(body))
	r = addChiURLParam(r, "id", uuid.New().String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Save(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestContentHandler_Save_NotOwned(t *testing.T) {
	uid := uuid.New()
	otherID := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: otherID, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `{"title":"test"}`
	r := httptest.NewRequest(http.MethodPut, "/api/content/"+cid.String(), strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Save(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

// ============================================================
// ListCategories (GET /api/content/categories)
// ============================================================

func TestContentHandler_ListCategories(t *testing.T) {
	uid := uuid.New()
	content := &mockContentRepo{}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	r := httptest.NewRequest(http.MethodGet, "/api/content/categories", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.ListCategories(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

type errListCategoriesRepo struct{ mockContentRepo }

func (m *errListCategoriesRepo) ListUserCategories(ctx context.Context, userID uuid.UUID) ([]string, error) {
	return nil, errors.New("test error")
}

func TestContentHandler_ListCategories_Error(t *testing.T) {
	uid := uuid.New()
	svc := application.NewContentService(&errListCategoriesRepo{}, &errListCategoriesRepo{}, &errListCategoriesRepo{}, &errListCategoriesRepo{}, &mockSourceLinker{})
	h := &ContentHandler{svc: svc}

	r := httptest.NewRequest(http.MethodGet, "/api/content/categories", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.ListCategories(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

type nilCategoriesRepo struct{ mockContentRepo }

func (m *nilCategoriesRepo) ListUserCategories(ctx context.Context, userID uuid.UUID) ([]string, error) {
	return nil, nil
}

func TestContentHandler_ListCategories_Nil(t *testing.T) {
	uid := uuid.New()
	svc := application.NewContentService(&nilCategoriesRepo{}, &nilCategoriesRepo{}, &nilCategoriesRepo{}, &nilCategoriesRepo{}, &mockSourceLinker{})
	h := &ContentHandler{svc: svc}

	r := httptest.NewRequest(http.MethodGet, "/api/content/categories", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.ListCategories(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	var categories []string
	json.NewDecoder(w.Body).Decode(&categories)
	if categories == nil {
		t.Error("expected empty slice, got nil")
	}
}

// ============================================================
// AddCategory (POST /api/content/{id}/categories)
// ============================================================

func TestContentHandler_AddCategory(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `{"category":"AI"}`
	r := httptest.NewRequest(http.MethodPost, "/api/content/"+cid.String()+"/categories", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.AddCategory(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["status"] != "category added" {
		t.Errorf(`expected status "category added", got %q`, resp["status"])
	}
}

func TestContentHandler_AddCategory_InvalidBody(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `not json`
	r := httptest.NewRequest(http.MethodPost, "/api/content/"+cid.String()+"/categories", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.AddCategory(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestContentHandler_AddCategory_EmptyCategory(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `{"category":"  "}`
	r := httptest.NewRequest(http.MethodPost, "/api/content/"+cid.String()+"/categories", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.AddCategory(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestContentHandler_AddCategory_NotOwned(t *testing.T) {
	uid := uuid.New()
	otherID := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: otherID, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `{"category":"AI"}`
	r := httptest.NewRequest(http.MethodPost, "/api/content/"+cid.String()+"/categories", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.AddCategory(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

// ============================================================
// RemoveCategory (DELETE /api/content/{id}/categories/{category})
// ============================================================

func TestContentHandler_RemoveCategory(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest, Categories: []string{"AI"}},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	r := httptest.NewRequest(http.MethodDelete, "/api/content/"+cid.String()+"/categories/AI", nil)
	r = addChiURLParam(r, "id", cid.String())
	r = addChiURLParam(r, "category", "AI")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.RemoveCategory(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["status"] != "category removed" {
		t.Errorf(`expected status "category removed", got %q`, resp["status"])
	}
}

func TestContentHandler_RemoveCategory_InvalidParam(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	r := httptest.NewRequest(http.MethodDelete, "/api/content/"+cid.String()+"/categories/invalid", nil)
	r = addChiURLParam(r, "id", cid.String())
	r = addChiURLParam(r, "category", "%zz")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.RemoveCategory(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestContentHandler_RemoveCategory_NotOwned(t *testing.T) {
	uid := uuid.New()
	otherID := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: otherID, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	r := httptest.NewRequest(http.MethodDelete, "/api/content/"+cid.String()+"/categories/AI", nil)
	r = addChiURLParam(r, "id", cid.String())
	r = addChiURLParam(r, "category", "AI")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.RemoveCategory(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

// ============================================================
// ListTags (GET /api/content/tags)
// ============================================================

func TestContentHandler_ListTags(t *testing.T) {
	uid := uuid.New()
	content := &mockContentRepo{}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	r := httptest.NewRequest(http.MethodGet, "/api/content/tags", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.ListTags(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

type errListTagsRepo struct{ mockContentRepo }

func (m *errListTagsRepo) ListUserTags(ctx context.Context, userID uuid.UUID) ([]string, error) {
	return nil, errors.New("test error")
}

func TestContentHandler_ListTags_Error(t *testing.T) {
	uid := uuid.New()
	svc := application.NewContentService(&errListTagsRepo{}, &errListTagsRepo{}, &errListTagsRepo{}, &errListTagsRepo{}, &mockSourceLinker{})
	h := &ContentHandler{svc: svc}

	r := httptest.NewRequest(http.MethodGet, "/api/content/tags", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.ListTags(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

type nilTagsRepo struct{ mockContentRepo }

func (m *nilTagsRepo) ListUserTags(ctx context.Context, userID uuid.UUID) ([]string, error) {
	return nil, nil
}

func TestContentHandler_ListTags_Nil(t *testing.T) {
	uid := uuid.New()
	svc := application.NewContentService(&nilTagsRepo{}, &nilTagsRepo{}, &nilTagsRepo{}, &nilTagsRepo{}, &mockSourceLinker{})
	h := &ContentHandler{svc: svc}

	r := httptest.NewRequest(http.MethodGet, "/api/content/tags", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.ListTags(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	var tags []string
	json.NewDecoder(w.Body).Decode(&tags)
	if tags == nil {
		t.Error("expected empty slice, got nil")
	}
}

// ============================================================
// AddTag (POST /api/content/{id}/tags)
// ============================================================

func TestContentHandler_AddTag(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `{"tag":"golang"}`
	r := httptest.NewRequest(http.MethodPost, "/api/content/"+cid.String()+"/tags", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.AddTag(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["status"] != "tag added" {
		t.Errorf(`expected status "tag added", got %q`, resp["status"])
	}
}

func TestContentHandler_AddTag_InvalidBody(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `not json`
	r := httptest.NewRequest(http.MethodPost, "/api/content/"+cid.String()+"/tags", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.AddTag(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestContentHandler_AddTag_EmptyTag(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `{"tag":"  "}`
	r := httptest.NewRequest(http.MethodPost, "/api/content/"+cid.String()+"/tags", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.AddTag(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestContentHandler_AddTag_NotOwned(t *testing.T) {
	uid := uuid.New()
	otherID := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: otherID, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `{"tag":"golang"}`
	r := httptest.NewRequest(http.MethodPost, "/api/content/"+cid.String()+"/tags", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.AddTag(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

// ============================================================
// RemoveTag (DELETE /api/content/{id}/tags/{tag})
// ============================================================

func TestContentHandler_RemoveTag(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	r := httptest.NewRequest(http.MethodDelete, "/api/content/"+cid.String()+"/tags/golang", nil)
	r = addChiURLParam(r, "id", cid.String())
	r = addChiURLParam(r, "tag", "golang")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.RemoveTag(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["status"] != "tag removed" {
		t.Errorf(`expected status "tag removed", got %q`, resp["status"])
	}
}

func TestContentHandler_RemoveTag_NotOwned(t *testing.T) {
	uid := uuid.New()
	otherID := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: otherID, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	r := httptest.NewRequest(http.MethodDelete, "/api/content/"+cid.String()+"/tags/golang", nil)
	r = addChiURLParam(r, "id", cid.String())
	r = addChiURLParam(r, "tag", "golang")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.RemoveTag(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

// ============================================================
// UpdateOutline (PUT /api/content/{id}/outline)
// ============================================================

func TestContentHandler_UpdateOutline(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `{"outline":"1. Intro\n2. Body\n3. Conclusion"}`
	r := httptest.NewRequest(http.MethodPut, "/api/content/"+cid.String()+"/outline", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateOutline(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["status"] != "updated" {
		t.Errorf(`expected status "updated", got %q`, resp["status"])
	}
}

func TestContentHandler_UpdateOutline_InvalidBody(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `not json`
	r := httptest.NewRequest(http.MethodPut, "/api/content/"+cid.String()+"/outline", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateOutline(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestContentHandler_UpdateOutline_NotOwned(t *testing.T) {
	uid := uuid.New()
	otherID := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: otherID, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `{"outline":"test"}`
	r := httptest.NewRequest(http.MethodPut, "/api/content/"+cid.String()+"/outline", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateOutline(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

func TestContentHandler_UpdateOutline_NotFound(t *testing.T) {
	uid := uuid.New()
	h := &ContentHandler{svc: application.NewContentService(&mockContentRepo{}, &mockContentRepo{}, &mockContentRepo{}, &mockContentRepo{}, &mockSourceLinker{})}

	body := `{"outline":"test"}`
	r := httptest.NewRequest(http.MethodPut, "/api/content/"+uuid.New().String()+"/outline", strings.NewReader(body))
	r = addChiURLParam(r, "id", uuid.New().String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateOutline(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

// ============================================================
// LinkSource (POST /api/content/{id}/link-source)
// ============================================================

func TestContentHandler_LinkSource(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	sourceID := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `{"source_id":"` + sourceID.String() + `"}`
	r := httptest.NewRequest(http.MethodPost, "/api/content/"+cid.String()+"/link-source", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.LinkSource(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["status"] != "linked" {
		t.Errorf(`expected status "linked", got %q`, resp["status"])
	}
}

func TestContentHandler_LinkSource_InvalidBody(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `not json`
	r := httptest.NewRequest(http.MethodPost, "/api/content/"+cid.String()+"/link-source", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.LinkSource(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestContentHandler_LinkSource_InvalidSourceID(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `{"source_id":"not-a-uuid"}`
	r := httptest.NewRequest(http.MethodPost, "/api/content/"+cid.String()+"/link-source", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.LinkSource(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// --- Transition tests ---

func TestContentHandler_Transition_Valid(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest, Status: domain.ContentBuilding},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `{"to":"review"}`
	r := httptest.NewRequest(http.MethodPost, "/api/content/"+cid.String()+"/transition", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Transition(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestContentHandler_Transition_Invalid(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest, Status: domain.ContentBuilding},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `{"to":"ready"}`
	r := httptest.NewRequest(http.MethodPost, "/api/content/"+cid.String()+"/transition", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Transition(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid transition, got %d: %s", w.Code, w.Body.String())
	}
}

func TestContentHandler_Transition_NotOwned(t *testing.T) {
	uid := uuid.New()
	otherID := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: otherID, Product: domain.ProductDigest, Status: domain.ContentBuilding},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `{"to":"review"}`
	r := httptest.NewRequest(http.MethodPost, "/api/content/"+cid.String()+"/transition", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Transition(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

func TestContentHandler_LegacyUpdateStatus_CannotBypassLifecycle(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest, Status: domain.ContentBuilding},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	// Legacy endpoint sends building → ready (invalid in Sprint 1 lifecycle)
	body := `{"status":"ready"}`
	r := httptest.NewRequest(http.MethodPut, "/api/content/"+cid.String()+"/status", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateStatus(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid transition through legacy endpoint, got %d: %s", w.Code, w.Body.String())
	}
}

func TestContentHandler_LegacyUpdateStatus_ValidTransitionWorks(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: uid, Product: domain.ProductDigest, Status: domain.ContentBuilding},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	// Legacy endpoint sends building → review (valid in Sprint 1 lifecycle)
	body := `{"status":"review"}`
	r := httptest.NewRequest(http.MethodPut, "/api/content/"+cid.String()+"/status", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateStatus(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for valid transition through legacy endpoint, got %d: %s", w.Code, w.Body.String())
	}
}

func TestContentHandler_LinkSource_NotOwned(t *testing.T) {
	uid := uuid.New()
	otherID := uuid.New()
	cid := uuid.New()
	sourceID := uuid.New()
	content := &mockContentRepo{
		items: []domain.GeneratedContent{
			{ID: cid, UserID: otherID, Product: domain.ProductDigest},
		},
	}
	h := &ContentHandler{svc: application.NewContentService(content, content, content, content, &mockSourceLinker{})}

	body := `{"source_id":"` + sourceID.String() + `"}`
	r := httptest.NewRequest(http.MethodPost, "/api/content/"+cid.String()+"/link-source", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.LinkSource(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}
