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

type mockSourceRepo struct {
	items     []digest.SourceConfig
	createErr error
	updateErr error
}

func (m *mockSourceRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]digest.SourceConfig, error) {
	var result []digest.SourceConfig
	for _, item := range m.items {
		if item.UserID == userID {
			result = append(result, item)
		}
	}
	return result, nil
}

func (m *mockSourceRepo) Create(ctx context.Context, userID uuid.UUID, name string, sourceType digest.SourceType, config json.RawMessage) (*digest.SourceConfig, error) {
	if m.createErr != nil {
		return nil, m.createErr
	}
	item := digest.SourceConfig{
		ID:        uuid.New(),
		UserID:    userID,
		Name:      name,
		Type:      sourceType,
		Config:    config,
		Enabled:   true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	if m.items == nil {
		m.items = make([]digest.SourceConfig, 0)
	}
	m.items = append(m.items, item)
	return &item, nil
}

func (m *mockSourceRepo) Update(ctx context.Context, id uuid.UUID, userID uuid.UUID, name string, sourceType digest.SourceType, config json.RawMessage, enabled bool) (*digest.SourceConfig, error) {
	if m.updateErr != nil {
		return nil, m.updateErr
	}
	for i, item := range m.items {
		if item.ID == id && item.UserID == userID {
			m.items[i].Name = name
			m.items[i].Type = sourceType
			m.items[i].Config = config
			m.items[i].Enabled = enabled
			m.items[i].UpdatedAt = time.Now()
			return &m.items[i], nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *mockSourceRepo) Delete(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	for i, item := range m.items {
		if item.ID == id && item.UserID == userID {
			m.items = append(m.items[:i], m.items[i+1:]...)
			return nil
		}
	}
	return domain.ErrNotFound
}

// Ensure mockSourceRepo implements digest.SourceRepository.
var _ digest.SourceRepository = (*mockSourceRepo)(nil)

// mockUserRepoForSources implements ports.UserRepository for source plan limit checks.
type mockUserRepoForSources struct {
	user domain.User
}

func (m *mockUserRepoForSources) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	return &m.user, nil
}
func (m *mockUserRepoForSources) Create(ctx context.Context, user *domain.User) error { return nil }
func (m *mockUserRepoForSources) GetByEmail(ctx context.Context, email string) (*domain.User, error) { return nil, domain.ErrNotFound }
func (m *mockUserRepoForSources) CountActiveSources(ctx context.Context, userID uuid.UUID) (int, error) { return 0, nil }
func (m *mockUserRepoForSources) CountActiveInterests(ctx context.Context, userID uuid.UUID) (int, error) { return 0, nil }
func (m *mockUserRepoForSources) UpdateRestrictSearch(ctx context.Context, userID uuid.UUID, restrict bool) error { return nil }
func (m *mockUserRepoForSources) UpdateThemePreference(ctx context.Context, userID uuid.UUID, theme domain.ThemePreference) error { return nil }

var _ ports.UserRepository = (*mockUserRepoForSources)(nil)

func TestSourcesHandler_List_Success(t *testing.T) {
	uid := uuid.New()
	config := json.RawMessage(`{"url":"https://example.com/rss"}`)
	repo := &mockSourceRepo{
		items: []digest.SourceConfig{
			{ID: uuid.New(), UserID: uid, Name: "Blog", Type: digest.SourceTypeRSS, Config: config, Enabled: true},
			{ID: uuid.New(), UserID: uid, Name: "News", Type: digest.SourceTypeWebSearch, Config: config, Enabled: false},
		},
	}
	h := NewSourcesHandler(repo, application.NewPlans(&mockUserRepoForSources{}))

	r := httptest.NewRequest(http.MethodGet, "/api/sources", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	var items []digest.SourceConfig
	json.NewDecoder(w.Body).Decode(&items)
	if len(items) != 2 {
		t.Errorf("expected 2 sources, got %d", len(items))
	}
	if items[0].Name != "Blog" {
		t.Errorf("expected first source name 'Blog', got %q", items[0].Name)
	}
}

func TestSourcesHandler_List_Unauthorized(t *testing.T) {
	h := NewSourcesHandler(&mockSourceRepo{}, application.NewPlans(&mockUserRepoForSources{}))

	r := httptest.NewRequest(http.MethodGet, "/api/sources", nil)
	w := httptest.NewRecorder()
	h.List(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSourcesHandler_Create_Success(t *testing.T) {
	uid := uuid.New()
	repo := &mockSourceRepo{}
	h := NewSourcesHandler(repo, application.NewPlans(&mockUserRepoForSources{}))

	body := `{"name":"My Blog","type":"rss","config":{"url":"https://example.com/rss"}}`
	r := httptest.NewRequest(http.MethodPost, "/api/sources", strings.NewReader(body))
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
	var item digest.SourceConfig
	json.NewDecoder(w.Body).Decode(&item)
	if item.Name != "My Blog" {
		t.Errorf("expected name 'My Blog', got %q", item.Name)
	}
	if item.Type != digest.SourceTypeRSS {
		t.Errorf("expected type rss, got %s", item.Type)
	}
	if item.UserID != uid {
		t.Errorf("expected userID %s, got %s", uid, item.UserID)
	}
}

func TestSourcesHandler_Create_InvalidJSON(t *testing.T) {
	uid := uuid.New()
	h := NewSourcesHandler(&mockSourceRepo{}, application.NewPlans(&mockUserRepoForSources{}))

	body := `not json`
	r := httptest.NewRequest(http.MethodPost, "/api/sources", strings.NewReader(body))
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestSourcesHandler_Create_MissingName(t *testing.T) {
	uid := uuid.New()
	h := NewSourcesHandler(&mockSourceRepo{}, application.NewPlans(&mockUserRepoForSources{}))

	body := `{"type":"rss","config":{}}`
	r := httptest.NewRequest(http.MethodPost, "/api/sources", strings.NewReader(body))
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestSourcesHandler_Create_MissingType(t *testing.T) {
	uid := uuid.New()
	h := NewSourcesHandler(&mockSourceRepo{}, application.NewPlans(&mockUserRepoForSources{}))

	body := `{"name":"My Blog","config":{}}`
	r := httptest.NewRequest(http.MethodPost, "/api/sources", strings.NewReader(body))
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestSourcesHandler_Update_Success(t *testing.T) {
	uid := uuid.New()
	sourceID := uuid.New()
	config := json.RawMessage(`{"url":"https://old.com/rss"}`)
	repo := &mockSourceRepo{
		items: []digest.SourceConfig{
			{ID: sourceID, UserID: uid, Name: "Old", Type: digest.SourceTypeRSS, Config: config, Enabled: true},
		},
	}
	h := NewSourcesHandler(repo, application.NewPlans(&mockUserRepoForSources{
		user: domain.User{MaxActiveSources: 10},
	}))

	body := `{"name":"Updated","type":"web_search","config":{"query":"tech"},"enabled":true}`
	r := httptest.NewRequest(http.MethodPut, "/api/sources/"+sourceID.String(), strings.NewReader(body))
	r = addChiURLParam(r, "id", sourceID.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Update(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var item digest.SourceConfig
	json.NewDecoder(w.Body).Decode(&item)
	if item.Name != "Updated" {
		t.Errorf("expected name 'Updated', got %q", item.Name)
	}
	if item.Type != digest.SourceTypeWebSearch {
		t.Errorf("expected type web_search, got %s", item.Type)
	}
}

func TestSourcesHandler_Update_Unauthorized(t *testing.T) {
	h := NewSourcesHandler(&mockSourceRepo{}, application.NewPlans(&mockUserRepoForSources{}))

	body := `{"name":"Updated","type":"rss","enabled":true}`
	r := httptest.NewRequest(http.MethodPut, "/api/sources/"+uuid.New().String(), strings.NewReader(body))
	r = addChiURLParam(r, "id", uuid.New().String())
	w := httptest.NewRecorder()
	h.Update(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSourcesHandler_Update_InvalidID(t *testing.T) {
	uid := uuid.New()
	h := NewSourcesHandler(&mockSourceRepo{}, application.NewPlans(&mockUserRepoForSources{}))

	body := `{"name":"Updated","type":"rss","enabled":true}`
	r := httptest.NewRequest(http.MethodPut, "/api/sources/bad-id", strings.NewReader(body))
	r = addChiURLParam(r, "id", "bad-id")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Update(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestSourcesHandler_Update_MissingName(t *testing.T) {
	uid := uuid.New()
	sourceID := uuid.New()
	h := NewSourcesHandler(&mockSourceRepo{}, application.NewPlans(&mockUserRepoForSources{}))

	body := `{"type":"rss","enabled":true}`
	r := httptest.NewRequest(http.MethodPut, "/api/sources/"+sourceID.String(), strings.NewReader(body))
	r = addChiURLParam(r, "id", sourceID.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Update(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestSourcesHandler_Update_BeyondPlanLimit(t *testing.T) {
	uid := uuid.New()
	existingID := uuid.New()
	config := json.RawMessage(`{}`)

	// Two enabled sources plus the one being toggled on
	repo := &mockSourceRepo{
		items: []digest.SourceConfig{
			{ID: uuid.New(), UserID: uid, Name: "Src1", Type: digest.SourceTypeRSS, Config: config, Enabled: true},
			{ID: uuid.New(), UserID: uid, Name: "Src2", Type: digest.SourceTypeRSS, Config: config, Enabled: true},
			{ID: existingID, UserID: uid, Name: "Src3", Type: digest.SourceTypeRSS, Config: config, Enabled: false},
		},
	}
	userRepo := &mockUserRepoForSources{
		user: domain.User{MaxActiveSources: 2},
	}
	h := NewSourcesHandler(repo, application.NewPlans(userRepo))

	body := `{"name":"Src3","type":"rss","enabled":true}`
	r := httptest.NewRequest(http.MethodPut, "/api/sources/"+existingID.String(), strings.NewReader(body))
	r = addChiURLParam(r, "id", existingID.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Update(w, r)

	if w.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d: %s", w.Code, w.Body.String())
	}
}

func TestSourcesHandler_Update_InvalidJSON(t *testing.T) {
	uid := uuid.New()
	sourceID := uuid.New()
	h := NewSourcesHandler(&mockSourceRepo{}, application.NewPlans(&mockUserRepoForSources{}))

	body := `not json`
	r := httptest.NewRequest(http.MethodPut, "/api/sources/"+sourceID.String(), strings.NewReader(body))
	r = addChiURLParam(r, "id", sourceID.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Update(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestSourcesHandler_Delete_Success(t *testing.T) {
	uid := uuid.New()
	sourceID := uuid.New()
	config := json.RawMessage(`{}`)
	repo := &mockSourceRepo{
		items: []digest.SourceConfig{
			{ID: sourceID, UserID: uid, Name: "Blog", Type: digest.SourceTypeRSS, Config: config, Enabled: true},
		},
	}
	h := NewSourcesHandler(repo, application.NewPlans(&mockUserRepoForSources{}))

	r := httptest.NewRequest(http.MethodDelete, "/api/sources/"+sourceID.String(), nil)
	r = addChiURLParam(r, "id", sourceID.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Delete(w, r)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", w.Code)
	}
}

func TestSourcesHandler_Delete_Unauthorized(t *testing.T) {
	h := NewSourcesHandler(&mockSourceRepo{}, application.NewPlans(&mockUserRepoForSources{}))

	r := httptest.NewRequest(http.MethodDelete, "/api/sources/"+uuid.New().String(), nil)
	r = addChiURLParam(r, "id", uuid.New().String())
	w := httptest.NewRecorder()
	h.Delete(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestSourcesHandler_Delete_InvalidID(t *testing.T) {
	uid := uuid.New()
	h := NewSourcesHandler(&mockSourceRepo{}, application.NewPlans(&mockUserRepoForSources{}))

	r := httptest.NewRequest(http.MethodDelete, "/api/sources/bad-id", nil)
	r = addChiURLParam(r, "id", "bad-id")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Delete(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

// --- Create unauthorized ---

func TestSourcesHandler_Create_Unauthorized(t *testing.T) {
	h := NewSourcesHandler(&mockSourceRepo{}, application.NewPlans(&mockUserRepoForSources{}))

	body := `{"name":"My Source","type":"rss","config":{}}`
	r := httptest.NewRequest(http.MethodPost, "/api/sources", strings.NewReader(body))
	w := httptest.NewRecorder()
	h.Create(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

// --- Update error paths ---

func TestSourcesHandler_Update_RepoError(t *testing.T) {
	uid := uuid.New()
	sourceID := uuid.New()
	config := json.RawMessage(`{}`)
	repo := &mockSourceRepo{
		items: []digest.SourceConfig{
			{ID: sourceID, UserID: uid, Name: "Blog", Type: digest.SourceTypeRSS, Config: config, Enabled: true},
		},
		updateErr: errors.New("db error"),
	}
	// Use user with sufficient MaxActiveSources so plan check passes
	h := NewSourcesHandler(repo, application.NewPlans(&mockUserRepoForSources{
		user: domain.User{MaxActiveSources: 10},
	}))

	body := `{"name":"Updated","type":"rss","enabled":true}`
	r := httptest.NewRequest(http.MethodPut, "/api/sources/"+sourceID.String(), strings.NewReader(body))
	r = addChiURLParam(r, "id", sourceID.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Update(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
	var resp apiError
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Error != "failed to update source" {
		t.Errorf("expected 'failed to update source', got %q", resp.Error)
	}
}
