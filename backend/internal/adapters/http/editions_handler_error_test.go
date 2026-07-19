package http

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/rodrigo-militao/forge/internal/core/application"
	"github.com/rodrigo-militao/forge/internal/lib"
	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

// --- List error path ---

type errListByUserFilteredRepo struct{ mockEditionRepo }

func (m *errListByUserFilteredRepo) ListByUserFiltered(ctx context.Context, userID uuid.UUID, status, category *string) ([]digest.Edition, error) {
	return nil, errors.New("list error")
}

func TestEditionHandler_List_RepoError(t *testing.T) {
	uid := uuid.New()
	repo := &errListByUserFilteredRepo{}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	r := httptest.NewRequest(http.MethodGet, "/api/editions", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.List(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- Create error path ---

type errCreateEditionRepo struct{ mockEditionRepo }

func (m *errCreateEditionRepo) Create(ctx context.Context, edition *digest.Edition) error {
	return errors.New("create error")
}

func TestEditionHandler_Create_RepoError(t *testing.T) {
	uid := uuid.New()
	repo := &errCreateEditionRepo{}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	body := `{"title":"My Newsletter"}`
	r := httptest.NewRequest(http.MethodPost, "/api/editions", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Create(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- UpdateBody error path ---

type errUpdateBodyEditionRepo struct{ mockEditionRepo }

func (m *errUpdateBodyEditionRepo) UpdateBody(ctx context.Context, id uuid.UUID, title, introduction string) error {
	return errors.New("update body error")
}

func TestEditionHandler_UpdateBody_RepoError(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &errUpdateBodyEditionRepo{
		mockEditionRepo: mockEditionRepo{
			editions: []digest.Edition{
				{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
			},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	body := `{"title":"New","body_html":"<p>Hi</p>"}`
	r := httptest.NewRequest(http.MethodPut, "/api/editions/"+eid.String()+"/body", strings.NewReader(body))
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateBody(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- UpdateCategory error paths ---

func TestEditionHandler_UpdateCategory_InvalidBody(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	r := httptest.NewRequest(http.MethodPut, "/api/editions/"+eid.String()+"/category", strings.NewReader("not json"))
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateCategory(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

type errUpdateCategoryEditionRepo struct{ mockEditionRepo }

func (m *errUpdateCategoryEditionRepo) UpdateCategory(ctx context.Context, id uuid.UUID, category *string) error {
	return errors.New("update category error")
}

func TestEditionHandler_UpdateCategory_RepoError(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &errUpdateCategoryEditionRepo{
		mockEditionRepo: mockEditionRepo{
			editions: []digest.Edition{
				{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
			},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	body := `{"category":"tech"}`
	r := httptest.NewRequest(http.MethodPut, "/api/editions/"+eid.String()+"/category", strings.NewReader(body))
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateCategory(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- AddTag error path ---

type errAddTagEditionRepo struct{ mockEditionRepo }

func (m *errAddTagEditionRepo) AddTag(ctx context.Context, editionID uuid.UUID, tag string) error {
	return errors.New("add tag error")
}

func TestEditionHandler_AddTag_RepoError(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &errAddTagEditionRepo{
		mockEditionRepo: mockEditionRepo{
			editions: []digest.Edition{
				{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
			},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	r := httptest.NewRequest(http.MethodPost, "/api/editions/"+eid.String()+"/tags/golang", nil)
	r = addChiURLParam(r, "id", eid.String())
	r = addChiURLParam(r, "tag", "golang")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.AddTag(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- RemoveTag error path ---

type errRemoveTagEditionRepo struct{ mockEditionRepo }

func (m *errRemoveTagEditionRepo) RemoveTag(ctx context.Context, editionID uuid.UUID, tag string) error {
	return errors.New("remove tag error")
}

func TestEditionHandler_RemoveTag_RepoError(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &errRemoveTagEditionRepo{
		mockEditionRepo: mockEditionRepo{
			editions: []digest.Edition{
				{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
			},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	r := httptest.NewRequest(http.MethodDelete, "/api/editions/"+eid.String()+"/tags/golang", nil)
	r = addChiURLParam(r, "id", eid.String())
	r = addChiURLParam(r, "tag", "golang")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.RemoveTag(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- GenerateIntro job creation error ---

func TestEditionHandler_GenerateIntro_JobCreateError(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
		},
	}
	jobs := &mockHelpersJobRepo{createErr: errors.New("db error")}
	usages := &mockUsageRepo{usage: 0}
	plans := plansWithMaxGenerations(uid, 10)
	h := NewEditionHandler(repo, jobs, usages, plans)

	r := httptest.NewRequest(http.MethodPost, "/api/editions/"+eid.String()+"/generate-intro", nil)
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.GenerateIntro(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- ListArticles error path ---

type errListArticlesEditionRepo struct{ mockEditionRepo }

func (m *errListArticlesEditionRepo) ListArticles(ctx context.Context, editionID uuid.UUID) ([]digest.ArticleRef, error) {
	return nil, errors.New("list articles error")
}

func TestEditionHandler_ListArticles_RepoError(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &errListArticlesEditionRepo{
		mockEditionRepo: mockEditionRepo{
			editions: []digest.Edition{
				{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
			},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	r := httptest.NewRequest(http.MethodGet, "/api/editions/"+eid.String()+"/articles", nil)
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.ListArticles(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- RemoveArticle error path ---

type errRemoveArticleEditionRepo struct{ mockEditionRepo }

func (m *errRemoveArticleEditionRepo) RemoveArticle(ctx context.Context, newsletterID, contentID uuid.UUID) error {
	return errors.New("remove article error")
}

func TestEditionHandler_RemoveArticle_RepoError(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	cid := uuid.New()
	repo := &errRemoveArticleEditionRepo{
		mockEditionRepo: mockEditionRepo{
			editions: []digest.Edition{
				{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
			},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	r := httptest.NewRequest(http.MethodDelete, "/api/editions/"+eid.String()+"/articles/"+cid.String(), nil)
	r = addChiURLParam(r, "id", eid.String())
	r = addChiURLParam(r, "contentID", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.RemoveArticle(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- Duplicate error path ---

type errDuplicateEditionRepo struct{ mockEditionRepo }

func (m *errDuplicateEditionRepo) Duplicate(ctx context.Context, editionID uuid.UUID) (*digest.Edition, error) {
	return nil, errors.New("duplicate error")
}

func TestEditionHandler_Duplicate_RepoError(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &errDuplicateEditionRepo{
		mockEditionRepo: mockEditionRepo{
			editions: []digest.Edition{
				{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
			},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	r := httptest.NewRequest(http.MethodPost, "/api/editions/"+eid.String()+"/duplicate", nil)
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Duplicate(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- UpdateDestination error paths ---

func TestEditionHandler_UpdateDestination_InvalidBody(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	r := httptest.NewRequest(http.MethodPut, "/api/editions/"+eid.String()+"/destination", strings.NewReader("not json"))
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateDestination(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEditionHandler_UpdateDestination_EmptyBecomesNil(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding, Destination: lib.StrPtr("old")},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	body := `{"destination":""}`
	r := httptest.NewRequest(http.MethodPut, "/api/editions/"+eid.String()+"/destination", strings.NewReader(body))
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateDestination(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	ed, _ := repo.GetByID(r.Context(), eid)
	if ed.Destination != nil {
		t.Errorf("expected nil destination after clearing, got %v", *ed.Destination)
	}
}

type errUpdateDestinationEditionRepo struct{ mockEditionRepo }

func (m *errUpdateDestinationEditionRepo) UpdateDestination(ctx context.Context, id uuid.UUID, destination *string) error {
	return errors.New("update destination error")
}

func TestEditionHandler_UpdateDestination_RepoError(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &errUpdateDestinationEditionRepo{
		mockEditionRepo: mockEditionRepo{
			editions: []digest.Edition{
				{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
			},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	body := `{"destination":"Substack"}`
	r := httptest.NewRequest(http.MethodPut, "/api/editions/"+eid.String()+"/destination", strings.NewReader(body))
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateDestination(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- ListDestinations error path ---

type errListUsedDestinationsRepo struct{ mockEditionRepo }

func (m *errListUsedDestinationsRepo) ListUsedDestinations(ctx context.Context, userID uuid.UUID) ([]string, error) {
	return nil, errors.New("list destinations error")
}

// --- UpdateStatus error paths ---

func TestEditionHandler_UpdateStatus_InvalidBody(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	r := httptest.NewRequest(http.MethodPut, "/api/editions/"+eid.String()+"/status", strings.NewReader("not json"))
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateStatus(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEditionHandler_UpdateStatus_SameStatusTransitionFails(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	body := `{"status":"building"}`
	r := httptest.NewRequest(http.MethodPut, "/api/editions/"+eid.String()+"/status", strings.NewReader(body))
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateStatus(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

type errUpdateStatusEditionRepo struct{ mockEditionRepo }

func (m *errUpdateStatusEditionRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status digest.EditionStatus) error {
	return errors.New("update status error")
}

func TestEditionHandler_UpdateStatus_RepoError(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &errUpdateStatusEditionRepo{
		mockEditionRepo: mockEditionRepo{
			editions: []digest.Edition{
				{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
			},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	body := `{"status":"review"}`
	r := httptest.NewRequest(http.MethodPut, "/api/editions/"+eid.String()+"/status", strings.NewReader(body))
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateStatus(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- AddArticle error path ---

type errAddArticleEditionRepo struct{ mockEditionRepo }

func (m *errAddArticleEditionRepo) AddArticle(ctx context.Context, newsletterID, contentID uuid.UUID) error {
	return errors.New("add article error")
}

func TestEditionHandler_AddArticle_RepoError(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	cid := uuid.New()
	repo := &errAddArticleEditionRepo{
		mockEditionRepo: mockEditionRepo{
			editions: []digest.Edition{
				{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
			},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	body := `{"content_id":"` + cid.String() + `"}`
	r := httptest.NewRequest(http.MethodPost, "/api/editions/"+eid.String()+"/articles", strings.NewReader(body))
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.AddArticle(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEditionHandler_ListDestinations_RepoError(t *testing.T) {
	uid := uuid.New()
	repo := &errListUsedDestinationsRepo{}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	r := httptest.NewRequest(http.MethodGet, "/api/editions/destinations", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.ListDestinations(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}
