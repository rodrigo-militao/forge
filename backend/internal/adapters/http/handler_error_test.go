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
	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

// --- SourcesHandler.List error path ---

type errListSourcesRepo struct{ mockSourceRepo }

func (m *errListSourcesRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]digest.SourceConfig, error) {
	return nil, errors.New("list error")
}

func TestSourcesHandler_List_RepoError(t *testing.T) {
	uid := uuid.New()
	repo := &errListSourcesRepo{}
	h := NewSourcesHandler(repo, application.NewPlans(&mockUserRepoForSources{}))

	r := httptest.NewRequest(http.MethodGet, "/api/sources", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.List(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- SourcesHandler.Create repo error ---

func TestSourcesHandler_Create_RepoError(t *testing.T) {
	uid := uuid.New()
	repo := &mockSourceRepo{createErr: errors.New("db error")}
	h := NewSourcesHandler(repo, application.NewPlans(&mockUserRepoForSources{}))

	body := `{"name":"My Blog","type":"rss","config":{"url":"https://example.com/rss"}}`
	r := httptest.NewRequest(http.MethodPost, "/api/sources", strings.NewReader(body))
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Create(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- SourcesHandler.Delete repo error ---

type errDeleteSourcesRepo struct{ mockSourceRepo }

func (m *errDeleteSourcesRepo) Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	return errors.New("delete error")
}

func TestSourcesHandler_Delete_RepoError(t *testing.T) {
	uid := uuid.New()
	sourceID := uuid.New()
	repo := &errDeleteSourcesRepo{}
	h := NewSourcesHandler(repo, application.NewPlans(&mockUserRepoForSources{}))

	r := httptest.NewRequest(http.MethodDelete, "/api/sources/"+sourceID.String(), nil)
	r = addChiURLParam(r, "id", sourceID.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Delete(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- InterestsHandler.List error path ---

type errListInterestsRepo struct{ mockInterestRepo }

func (m *errListInterestsRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]digest.DigestInterest, error) {
	return nil, errors.New("list error")
}

func TestInterestsHandler_List_RepoError(t *testing.T) {
	uid := uuid.New()
	repo := &errListInterestsRepo{}
	h := NewInterestsHandler(repo, application.NewPlans(&mockUserRepoForPlans{}))

	r := httptest.NewRequest(http.MethodGet, "/api/interests", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.List(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- InterestsHandler.Create repo error ---

func TestInterestsHandler_Create_RepoError(t *testing.T) {
	uid := uuid.New()
	repo := &mockInterestRepo{createErr: errors.New("db error")}
	h := NewInterestsHandler(repo, application.NewPlans(&mockUserRepoForPlans{}))

	body := `{"label":"Tech"}`
	r := httptest.NewRequest(http.MethodPost, "/api/interests", strings.NewReader(body))
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Create(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// --- InterestsHandler.Delete repo error ---

type errDeleteInterestsRepo struct{ mockInterestRepo }

func (m *errDeleteInterestsRepo) Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	return errors.New("delete error")
}

func TestInterestsHandler_Delete_RepoError(t *testing.T) {
	uid := uuid.New()
	interestID := uuid.New()
	repo := &errDeleteInterestsRepo{}
	h := NewInterestsHandler(repo, application.NewPlans(&mockUserRepoForPlans{}))

	r := httptest.NewRequest(http.MethodDelete, "/api/interests/"+interestID.String(), nil)
	r = addChiURLParam(r, "id", interestID.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Delete(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

