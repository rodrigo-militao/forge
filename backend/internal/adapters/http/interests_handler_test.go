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

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/application"
	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

type mockInterestRepo struct {
	items            []digest.DigestInterest
	createErr        error
	updateEnabledErr error
}

func (m *mockInterestRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]digest.DigestInterest, error) {
	var result []digest.DigestInterest
	for _, item := range m.items {
		if item.UserID == userID {
			result = append(result, item)
		}
	}
	return result, nil
}

func (m *mockInterestRepo) Create(ctx context.Context, userID uuid.UUID, label string) (*digest.DigestInterest, error) {
	if m.createErr != nil {
		return nil, m.createErr
	}
	item := digest.DigestInterest{
		ID:        uuid.New(),
		UserID:    userID,
		Label:     label,
		Enabled:   true,
		CreatedAt: time.Now(),
	}
	if m.items == nil {
		m.items = make([]digest.DigestInterest, 0)
	}
	m.items = append(m.items, item)
	return &item, nil
}

func (m *mockInterestRepo) UpdateEnabled(ctx context.Context, id uuid.UUID, userID uuid.UUID, enabled bool) error {
	if m.updateEnabledErr != nil {
		return m.updateEnabledErr
	}
	for i, item := range m.items {
		if item.ID == id && item.UserID == userID {
			m.items[i].Enabled = enabled
			return nil
		}
	}
	return domain.ErrNotFound
}

func (m *mockInterestRepo) Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	for i, item := range m.items {
		if item.ID == id && item.UserID == userID {
			m.items = append(m.items[:i], m.items[i+1:]...)
			return nil
		}
	}
	return domain.ErrNotFound
}

// errGetByIDUserRepo wraps mockUserRepoForPlans and returns an error from GetByID.
type errGetByIDUserRepo struct {
	mockUserRepoForPlans
}

func (m *errGetByIDUserRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	return nil, errors.New("user lookup failed")
}

// Ensure mockInterestRepo implements digest.DigestInterestRepository.
var _ digest.DigestInterestRepository = (*mockInterestRepo)(nil)

// mockUserRepoForPlans implements ports.UserRepository for plan limit checks.
type mockUserRepoForPlans struct {
	user domain.User
}

func (m *mockUserRepoForPlans) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	return &m.user, nil
}
func (m *mockUserRepoForPlans) Create(ctx context.Context, user *domain.User) error { return nil }
func (m *mockUserRepoForPlans) GetByEmail(ctx context.Context, email string) (*domain.User, error) { return nil, domain.ErrNotFound }
func (m *mockUserRepoForPlans) CountActiveSources(ctx context.Context, userID uuid.UUID) (int, error) { return 0, nil }
func (m *mockUserRepoForPlans) CountActiveInterests(ctx context.Context, userID uuid.UUID) (int, error) { return 0, nil }
func (m *mockUserRepoForPlans) UpdateRestrictSearch(ctx context.Context, userID uuid.UUID, restrict bool) error { return nil }
func (m *mockUserRepoForPlans) UpdateThemePreference(ctx context.Context, userID uuid.UUID, theme domain.ThemePreference) error { return nil }

var _ ports.UserRepository = (*mockUserRepoForPlans)(nil)

func TestInterestsHandler_List_Success(t *testing.T) {
	uid := uuid.New()
	repo := &mockInterestRepo{
		items: []digest.DigestInterest{
			{ID: uuid.New(), UserID: uid, Label: "AI", Enabled: true},
			{ID: uuid.New(), UserID: uid, Label: "Golang", Enabled: false},
		},
	}
	plans := application.NewPlans(&mockUserRepoForPlans{})
	h := NewInterestsHandler(repo, plans)

	r := httptest.NewRequest(http.MethodGet, "/api/interests", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	var items []digest.DigestInterest
	json.NewDecoder(w.Body).Decode(&items)
	if len(items) != 2 {
		t.Errorf("expected 2 items, got %d", len(items))
	}
}

func TestInterestsHandler_List_Unauthorized(t *testing.T) {
	h := NewInterestsHandler(&mockInterestRepo{}, application.NewPlans(&mockUserRepoForPlans{}))

	r := httptest.NewRequest(http.MethodGet, "/api/interests", nil)
	w := httptest.NewRecorder()
	h.List(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestInterestsHandler_List_Error(t *testing.T) {
	uid := uuid.New()
	repo := &mockInterestRepo{createErr: domain.ErrNotFound} // createErr not used by List
	h := NewInterestsHandler(repo, application.NewPlans(&mockUserRepoForPlans{}))

	r := httptest.NewRequest(http.MethodGet, "/api/interests", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestInterestsHandler_Create_Success(t *testing.T) {
	uid := uuid.New()
	repo := &mockInterestRepo{}
	h := NewInterestsHandler(repo, application.NewPlans(&mockUserRepoForPlans{}))

	body := `{"label":"Tech"}`
	r := httptest.NewRequest(http.MethodPost, "/api/interests", strings.NewReader(body))
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
	var item digest.DigestInterest
	json.NewDecoder(w.Body).Decode(&item)
	if item.Label != "Tech" {
		t.Errorf("expected label 'Tech', got %q", item.Label)
	}
	if item.UserID != uid {
		t.Errorf("expected userID %s, got %s", uid, item.UserID)
	}
}

func TestInterestsHandler_Create_InvalidBody(t *testing.T) {
	uid := uuid.New()
	h := NewInterestsHandler(&mockInterestRepo{}, application.NewPlans(&mockUserRepoForPlans{}))

	body := `not json`
	r := httptest.NewRequest(http.MethodPost, "/api/interests", strings.NewReader(body))
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestInterestsHandler_Create_EmptyLabel(t *testing.T) {
	uid := uuid.New()
	h := NewInterestsHandler(&mockInterestRepo{}, application.NewPlans(&mockUserRepoForPlans{}))

	body := `{"label":""}`
	r := httptest.NewRequest(http.MethodPost, "/api/interests", strings.NewReader(body))
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestInterestsHandler_Create_Unauthorized(t *testing.T) {
	h := NewInterestsHandler(&mockInterestRepo{}, application.NewPlans(&mockUserRepoForPlans{}))

	body := `{"label":"Tech"}`
	r := httptest.NewRequest(http.MethodPost, "/api/interests", strings.NewReader(body))
	w := httptest.NewRecorder()
	h.Create(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestInterestsHandler_UpdateEnabled_Success(t *testing.T) {
	uid := uuid.New()
	interestID := uuid.New()
	repo := &mockInterestRepo{
		items: []digest.DigestInterest{
			{ID: interestID, UserID: uid, Label: "AI", Enabled: true},
		},
	}
	h := NewInterestsHandler(repo, application.NewPlans(&mockUserRepoForPlans{
		user: domain.User{MaxActiveInterests: 10},
	}))

	body := `{"enabled":false}`
	r := httptest.NewRequest(http.MethodPut, "/api/interests/"+interestID.String(), strings.NewReader(body))
	r = addChiURLParam(r, "id", interestID.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateEnabled(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]string
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["status"] != "updated" {
		t.Errorf("expected 'updated', got %q", resp["status"])
	}
}

func TestInterestsHandler_UpdateEnabled_Unauthorized(t *testing.T) {
	h := NewInterestsHandler(&mockInterestRepo{}, application.NewPlans(&mockUserRepoForPlans{}))

	body := `{"enabled":false}`
	r := httptest.NewRequest(http.MethodPut, "/api/interests/"+uuid.New().String(), strings.NewReader(body))
	r = addChiURLParam(r, "id", uuid.New().String())
	w := httptest.NewRecorder()
	h.UpdateEnabled(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestInterestsHandler_UpdateEnabled_InvalidID(t *testing.T) {
	uid := uuid.New()
	h := NewInterestsHandler(&mockInterestRepo{}, application.NewPlans(&mockUserRepoForPlans{}))

	body := `{"enabled":false}`
	r := httptest.NewRequest(http.MethodPut, "/api/interests/bad-id", strings.NewReader(body))
	r = addChiURLParam(r, "id", "bad-id")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateEnabled(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestInterestsHandler_UpdateEnabled_InvalidBody(t *testing.T) {
	uid := uuid.New()
	interestID := uuid.New()
	h := NewInterestsHandler(&mockInterestRepo{}, application.NewPlans(&mockUserRepoForPlans{}))

	body := `not json`
	r := httptest.NewRequest(http.MethodPut, "/api/interests/"+interestID.String(), strings.NewReader(body))
	r = addChiURLParam(r, "id", interestID.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateEnabled(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestInterestsHandler_UpdateEnabled_BeyondPlanLimit(t *testing.T) {
	uid := uuid.New()
	existingID := uuid.New()

	// Two enabled interests already, plus the one being toggled = 3, limit is 2
	repo := &mockInterestRepo{
		items: []digest.DigestInterest{
			{ID: uuid.New(), UserID: uid, Label: "AI", Enabled: true},
			{ID: uuid.New(), UserID: uid, Label: "Golang", Enabled: true},
			{ID: existingID, UserID: uid, Label: "Web", Enabled: false},
		},
	}
	userRepo := &mockUserRepoForPlans{
		user: domain.User{MaxActiveInterests: 2},
	}
	h := NewInterestsHandler(repo, application.NewPlans(userRepo))

	body := `{"enabled":true}`
	r := httptest.NewRequest(http.MethodPut, "/api/interests/"+existingID.String(), strings.NewReader(body))
	r = addChiURLParam(r, "id", existingID.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateEnabled(w, r)

	if w.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d: %s", w.Code, w.Body.String())
	}
}

func TestInterestsHandler_Delete_Success(t *testing.T) {
	uid := uuid.New()
	interestID := uuid.New()
	repo := &mockInterestRepo{
		items: []digest.DigestInterest{
			{ID: interestID, UserID: uid, Label: "AI", Enabled: true},
		},
	}
	h := NewInterestsHandler(repo, application.NewPlans(&mockUserRepoForPlans{}))

	r := httptest.NewRequest(http.MethodDelete, "/api/interests/"+interestID.String(), nil)
	r = addChiURLParam(r, "id", interestID.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Delete(w, r)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", w.Code)
	}
}

func TestInterestsHandler_Delete_Unauthorized(t *testing.T) {
	h := NewInterestsHandler(&mockInterestRepo{}, application.NewPlans(&mockUserRepoForPlans{}))

	r := httptest.NewRequest(http.MethodDelete, "/api/interests/"+uuid.New().String(), nil)
	r = addChiURLParam(r, "id", uuid.New().String())
	w := httptest.NewRecorder()
	h.Delete(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestInterestsHandler_Delete_InvalidID(t *testing.T) {
	uid := uuid.New()
	h := NewInterestsHandler(&mockInterestRepo{}, application.NewPlans(&mockUserRepoForPlans{}))

	r := httptest.NewRequest(http.MethodDelete, "/api/interests/bad-id", nil)
	r = addChiURLParam(r, "id", "bad-id")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Delete(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// --- UpdateEnabled error paths ---

func TestInterestsHandler_UpdateEnabled_RepoError(t *testing.T) {
	uid := uuid.New()
	interestID := uuid.New()
	repo := &mockInterestRepo{
		items: []digest.DigestInterest{
			{ID: interestID, UserID: uid, Label: "AI", Enabled: true},
		},
		updateEnabledErr: errors.New("db error"),
	}
	h := NewInterestsHandler(repo, application.NewPlans(&mockUserRepoForPlans{
		user: domain.User{MaxActiveInterests: 10},
	}))

	body := `{"enabled":false}`
	r := httptest.NewRequest(http.MethodPut, "/api/interests/"+interestID.String(), strings.NewReader(body))
	r = addChiURLParam(r, "id", interestID.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateEnabled(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
	var resp apiError
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Error != "failed to update interest" {
		t.Errorf("expected 'failed to update interest', got %q", resp.Error)
	}
}

func TestInterestsHandler_UpdateEnabled_PlanCheckError(t *testing.T) {
	uid := uuid.New()
	interestID := uuid.New()
	repo := &mockInterestRepo{
		items: []digest.DigestInterest{
			{ID: interestID, UserID: uid, Label: "AI", Enabled: false},
		},
	}
	// User repo that errors on GetByID — plan check will fail
	userRepo := &mockUserRepoForPlans{
		user: domain.User{MaxActiveInterests: 10},
	}
	// We need GetByID to fail for CheckInterestLimit. Since mockUserRepoForPlans always succeeds,
	// create an embedded type that returns an error.
	errUserRepo := &errGetByIDUserRepo{mockUserRepoForPlans: *userRepo}
	h := NewInterestsHandler(repo, application.NewPlans(errUserRepo))

	body := `{"enabled":true}`
	r := httptest.NewRequest(http.MethodPut, "/api/interests/"+interestID.String(), strings.NewReader(body))
	r = addChiURLParam(r, "id", interestID.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateEnabled(w, r)

	if w.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d: %s", w.Code, w.Body.String())
	}
}
