package http

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/rodrigo-militao/forge/internal/core/application"
	"github.com/rodrigo-militao/forge/internal/core/domain"
)

// --- List error path ---

type errListContentRepo struct{ mockContentRepo }

func (m *errListContentRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.GeneratedContent, error) {
	return nil, errors.New("list error")
}

func TestContentHandler_List_RepoError(t *testing.T) {
	uid := uuid.New()
	svc := application.NewContentService(&errListContentRepo{}, &errListContentRepo{}, &errListContentRepo{}, &errListContentRepo{}, &mockSourceLinker{})
	h := &ContentHandler{svc: svc}

	r := httptest.NewRequest(http.MethodGet, "/api/content", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.List(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- saveOrDelete invalid UUID (exercised via Delete) ---

func TestContentHandler_Delete_InvalidUUID(t *testing.T) {
	uid := uuid.New()
	svc := application.NewContentService(&mockContentRepo{}, &mockContentRepo{}, &mockContentRepo{}, &mockContentRepo{}, &mockSourceLinker{})
	h := &ContentHandler{svc: svc}

	r := httptest.NewRequest(http.MethodDelete, "/api/content/not-a-uuid", nil)
	r = addChiURLParam(r, "id", "not-a-uuid")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Delete(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
	var resp apiError
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Error != "invalid content id" {
		t.Errorf("expected 'invalid content id', got %q", resp.Error)
	}
}

// --- Save error path (repo error on UpdateBody) ---

type errUpdateBodyContentRepo struct{ mockContentRepo }

func (m *errUpdateBodyContentRepo) UpdateBody(ctx context.Context, id uuid.UUID, title, body *string) error {
	return errors.New("update body error")
}

func TestContentHandler_Save_RepoError(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	repo := &errUpdateBodyContentRepo{
		mockContentRepo: mockContentRepo{
			items: []domain.GeneratedContent{
				{ID: cid, UserID: uid, Product: domain.ProductDigest},
			},
		},
	}
	svc := application.NewContentService(repo, repo, repo, repo, &mockSourceLinker{})
	h := &ContentHandler{svc: svc}

	body := `{"title":"New Title","body_markdown":"New Body"}`
	r := httptest.NewRequest(http.MethodPut, "/api/content/"+cid.String(), strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Save(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- Delete error path (repo error on SoftDelete) ---

type errSoftDeleteContentRepo struct{ mockContentRepo }

func (m *errSoftDeleteContentRepo) SoftDelete(ctx context.Context, id uuid.UUID) error {
	return errors.New("soft delete error")
}

func TestContentHandler_Delete_RepoError(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	repo := &errSoftDeleteContentRepo{
		mockContentRepo: mockContentRepo{
			items: []domain.GeneratedContent{
				{ID: cid, UserID: uid, Product: domain.ProductDigest},
			},
		},
	}
	svc := application.NewContentService(repo, repo, repo, repo, &mockSourceLinker{})
	h := &ContentHandler{svc: svc}

	r := httptest.NewRequest(http.MethodDelete, "/api/content/"+cid.String(), nil)
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Delete(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- UpdateCategories error paths ---

func TestContentHandler_UpdateCategories_InvalidBody(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	svc := application.NewContentService(
		&mockContentRepo{items: []domain.GeneratedContent{{ID: cid, UserID: uid, Product: domain.ProductDigest}}},
		&mockContentRepo{},
		&mockContentRepo{},
		&mockContentRepo{},
		&mockSourceLinker{},
	)
	h := &ContentHandler{svc: svc}

	r := httptest.NewRequest(http.MethodPut, "/api/content/"+cid.String()+"/categories", strings.NewReader("not json"))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateCategories(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

type errSetCategoriesContentRepo struct{ mockContentRepo }

func (m *errSetCategoriesContentRepo) SetCategories(ctx context.Context, id uuid.UUID, categories []string) error {
	return errors.New("set categories error")
}

func TestContentHandler_UpdateCategories_RepoError(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	repo := &errSetCategoriesContentRepo{
		mockContentRepo: mockContentRepo{
			items: []domain.GeneratedContent{
				{ID: cid, UserID: uid, Product: domain.ProductDigest},
			},
		},
	}
	svc := application.NewContentService(repo, repo, repo, repo, &mockSourceLinker{})
	h := &ContentHandler{svc: svc}

	body := `{"categories":["AI","Web"]}`
	r := httptest.NewRequest(http.MethodPut, "/api/content/"+cid.String()+"/categories", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateCategories(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

func TestContentHandler_UpdateCategories_InvalidUUID(t *testing.T) {
	uid := uuid.New()
	svc := application.NewContentService(&mockContentRepo{}, &mockContentRepo{}, &mockContentRepo{}, &mockContentRepo{}, &mockSourceLinker{})
	h := &ContentHandler{svc: svc}

	body := `{"categories":["AI","Web"]}`
	r := httptest.NewRequest(http.MethodPut, "/api/content/not-a-uuid/categories", strings.NewReader(body))
	r = addChiURLParam(r, "id", "not-a-uuid")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateCategories(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
	var resp apiError
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Error != "invalid content id" {
		t.Errorf("expected 'invalid content id', got %q", resp.Error)
	}
}

// --- RemoveTag error paths ---

func TestContentHandler_RemoveTag_InvalidParam(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	svc := application.NewContentService(
		&mockContentRepo{items: []domain.GeneratedContent{{ID: cid, UserID: uid, Product: domain.ProductDigest}}},
		&mockContentRepo{},
		&mockContentRepo{},
		&mockContentRepo{},
		&mockSourceLinker{},
	)
	h := &ContentHandler{svc: svc}

	r := httptest.NewRequest(http.MethodDelete, "/api/content/"+cid.String()+"/tags/invalid", nil)
	r = addChiURLParam(r, "id", cid.String())
	r = addChiURLParam(r, "tag", "%zz")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.RemoveTag(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

type errRemoveTagContentRepo struct{ mockContentRepo }

func (m *errRemoveTagContentRepo) RemoveTag(ctx context.Context, id uuid.UUID, tag string) error {
	return errors.New("remove tag error")
}

func TestContentHandler_RemoveTag_RepoError(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	repo := &errRemoveTagContentRepo{
		mockContentRepo: mockContentRepo{
			items: []domain.GeneratedContent{
				{ID: cid, UserID: uid, Product: domain.ProductDigest},
			},
		},
	}
	svc := application.NewContentService(repo, repo, repo, repo, &mockSourceLinker{})
	h := &ContentHandler{svc: svc}

	r := httptest.NewRequest(http.MethodDelete, "/api/content/"+cid.String()+"/tags/golang", nil)
	r = addChiURLParam(r, "id", cid.String())
	r = addChiURLParam(r, "tag", "golang")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.RemoveTag(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- AddCategory repo error path ---

type errAddCategoryContentRepo struct{ mockContentRepo }

func (m *errAddCategoryContentRepo) AddCategory(ctx context.Context, id uuid.UUID, category string) error {
	return errors.New("add category error")
}

func TestContentHandler_AddCategory_RepoError(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	repo := &errAddCategoryContentRepo{
		mockContentRepo: mockContentRepo{
			items: []domain.GeneratedContent{
				{ID: cid, UserID: uid, Product: domain.ProductDigest},
			},
		},
	}
	svc := application.NewContentService(repo, repo, repo, repo, &mockSourceLinker{})
	h := &ContentHandler{svc: svc}

	body := `{"category":"AI"}`
	r := httptest.NewRequest(http.MethodPost, "/api/content/"+cid.String()+"/categories", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.AddCategory(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- RemoveCategory repo error path ---

type errRemoveCategoryContentRepo struct{ mockContentRepo }

func (m *errRemoveCategoryContentRepo) RemoveCategory(ctx context.Context, id uuid.UUID, category string) error {
	return errors.New("remove category error")
}

func TestContentHandler_RemoveCategory_RepoError(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	repo := &errRemoveCategoryContentRepo{
		mockContentRepo: mockContentRepo{
			items: []domain.GeneratedContent{
				{ID: cid, UserID: uid, Product: domain.ProductDigest, Categories: []string{"AI"}},
			},
		},
	}
	svc := application.NewContentService(repo, repo, repo, repo, &mockSourceLinker{})
	h := &ContentHandler{svc: svc}

	r := httptest.NewRequest(http.MethodDelete, "/api/content/"+cid.String()+"/categories/AI", nil)
	r = addChiURLParam(r, "id", cid.String())
	r = addChiURLParam(r, "category", "AI")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.RemoveCategory(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- AddTag repo error path ---

type errAddTagContentRepo struct{ mockContentRepo }

func (m *errAddTagContentRepo) AddTag(ctx context.Context, id uuid.UUID, tag string) error {
	return errors.New("add tag error")
}

func TestContentHandler_AddTag_RepoError(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	repo := &errAddTagContentRepo{
		mockContentRepo: mockContentRepo{
			items: []domain.GeneratedContent{
				{ID: cid, UserID: uid, Product: domain.ProductDigest},
			},
		},
	}
	svc := application.NewContentService(repo, repo, repo, repo, &mockSourceLinker{})
	h := &ContentHandler{svc: svc}

	body := `{"tag":"golang"}`
	r := httptest.NewRequest(http.MethodPost, "/api/content/"+cid.String()+"/tags", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.AddTag(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- LinkSource repo error path ---

type errLinkSourceContentRepo struct{ mockContentRepo }

func (m *errLinkSourceContentRepo) LinkSource(ctx context.Context, id uuid.UUID, sourceID uuid.UUID) error {
	return errors.New("link source error")
}

// We need the LinkSource method on the svc to fail. The svc calls svc.LinkSource which calls
// the sourceLinker.SetContentSource. We need the sourceLinker to fail, not the content repo.
// Actually looking at the code: h.svc.LinkSource calls ContentService.LinkSource which calls
// source.SetContentSource. So we need a mockSourceLinker that fails.

type errSourceLinker struct{}

func (e *errSourceLinker) SetContentSource(ctx context.Context, contentID, sourceID uuid.UUID) error {
	return errors.New("link source error")
}

func TestContentHandler_LinkSource_RepoError(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	sourceID := uuid.New()
	svc := application.NewContentService(
		&mockContentRepo{items: []domain.GeneratedContent{{ID: cid, UserID: uid, Product: domain.ProductDigest}}},
		&mockContentRepo{},
		&mockContentRepo{},
		&mockContentRepo{},
		&errSourceLinker{},
	)
	h := &ContentHandler{svc: svc}

	body := `{"source_id":"` + sourceID.String() + `"}`
	r := httptest.NewRequest(http.MethodPost, "/api/content/"+cid.String()+"/link-source", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.LinkSource(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- UpdateStatus error paths ---

func TestContentHandler_UpdateStatus_InvalidBody(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	svc := application.NewContentService(
		&mockContentRepo{items: []domain.GeneratedContent{{ID: cid, UserID: uid, Product: domain.ProductDigest, Status: domain.ContentDraft}}},
		&mockContentRepo{},
		&mockContentRepo{},
		&mockContentRepo{},
		&mockSourceLinker{},
	)
	h := &ContentHandler{svc: svc}

	r := httptest.NewRequest(http.MethodPut, "/api/content/"+cid.String()+"/status", strings.NewReader("not json"))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateStatus(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

type errUpdateStatusContentRepo struct{ mockContentRepo }

func (m *errUpdateStatusContentRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.ContentStatus) error {
	return errors.New("update status error")
}
func (m *errUpdateStatusContentRepo) UpdateStatusWithPublishedAt(ctx context.Context, id uuid.UUID, status domain.ContentStatus) error {
	return errors.New("update status error")
}

func TestContentHandler_UpdateStatus_RepoError(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	repo := &errUpdateStatusContentRepo{
		mockContentRepo: mockContentRepo{
			items: []domain.GeneratedContent{
				{ID: cid, UserID: uid, Product: domain.ProductDigest, Status: domain.ContentReady},
			},
		},
	}
	svc := application.NewContentService(repo, repo, repo, repo, &mockSourceLinker{})
	h := &ContentHandler{svc: svc}

	body := `{"status":"published"}`
	r := httptest.NewRequest(http.MethodPut, "/api/content/"+cid.String()+"/status", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateStatus(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- UpdateOutline repo error path ---

type errUpdateOutlineContentRepo struct{ mockContentRepo }

func (m *errUpdateOutlineContentRepo) UpdateOutline(ctx context.Context, id uuid.UUID, outline *string) error {
	return errors.New("update outline error")
}

func TestContentHandler_UpdateOutline_RepoError(t *testing.T) {
	uid := uuid.New()
	cid := uuid.New()
	repo := &errUpdateOutlineContentRepo{
		mockContentRepo: mockContentRepo{
			items: []domain.GeneratedContent{
				{ID: cid, UserID: uid, Product: domain.ProductDigest},
			},
		},
	}
	svc := application.NewContentService(repo, repo, repo, repo, &mockSourceLinker{})
	h := &ContentHandler{svc: svc}

	body := `{"outline":"1. Intro"}`
	r := httptest.NewRequest(http.MethodPut, "/api/content/"+cid.String()+"/outline", strings.NewReader(body))
	r = addChiURLParam(r, "id", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateOutline(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}
