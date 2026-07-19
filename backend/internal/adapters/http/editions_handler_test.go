package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/rodrigo-militao/forge/internal/core/application"
	"github.com/rodrigo-militao/forge/internal/core/domain"
	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

// mockEditionRepo implements digest.EditionRepository for testing.
type mockEditionRepo struct {
	editions  []digest.Edition
	articles  map[uuid.UUID][]digest.ArticleRef
	usedDests []string
	userID    uuid.UUID
}

func (m *mockEditionRepo) Create(ctx context.Context, edition *digest.Edition) error {
	edition.ID = uuid.New()
	edition.CreatedAt = time.Now()
	edition.UpdatedAt = time.Now()
	if edition.Status == "" {
		edition.Status = digest.EditionBuilding
	}
	m.editions = append(m.editions, *edition)
	return nil
}

func (m *mockEditionRepo) GetByID(ctx context.Context, id uuid.UUID) (*digest.Edition, error) {
	for _, e := range m.editions {
		if e.ID == id {
			return &e, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *mockEditionRepo) ListByUser(ctx context.Context, userID uuid.UUID) ([]digest.Edition, error) {
	return m.editions, nil
}

func (m *mockEditionRepo) ListByUserFiltered(ctx context.Context, userID uuid.UUID, status, category *string) ([]digest.Edition, error) {
	var result []digest.Edition
	for _, e := range m.editions {
		if status != nil && string(e.Status) != *status {
			continue
		}
		if category != nil && (e.Category == nil || *e.Category != *category) {
			continue
		}
		result = append(result, e)
	}
	return result, nil
}

func (m *mockEditionRepo) UpdateBody(ctx context.Context, id uuid.UUID, title, introduction string) error {
	for i, e := range m.editions {
		if e.ID == id {
			m.editions[i].Title = title
			m.editions[i].Introduction = introduction
			return nil
		}
	}
	return domain.ErrNotFound
}

func (m *mockEditionRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status digest.EditionStatus) error {
	for i, e := range m.editions {
		if e.ID == id {
			if err := e.Status.ValidateTransition(status); err != nil {
				return err
			}
			m.editions[i].Status = status
			m.editions[i].UpdatedAt = time.Now()
			return nil
		}
	}
	return domain.ErrNotFound
}

func (m *mockEditionRepo) UpdateCategory(ctx context.Context, id uuid.UUID, category *string) error {
	for i, e := range m.editions {
		if e.ID == id {
			m.editions[i].Category = category
			return nil
		}
	}
	return domain.ErrNotFound
}

func (m *mockEditionRepo) AddTag(ctx context.Context, editionID uuid.UUID, tag string) error {
	return nil
}

func (m *mockEditionRepo) RemoveTag(ctx context.Context, editionID uuid.UUID, tag string) error {
	return nil
}

func (m *mockEditionRepo) AddArticle(ctx context.Context, newsletterID, contentID uuid.UUID) error {
	return nil
}

func (m *mockEditionRepo) RemoveArticle(ctx context.Context, newsletterID, contentID uuid.UUID) error {
	return nil
}

func (m *mockEditionRepo) ListArticles(ctx context.Context, editionID uuid.UUID) ([]digest.ArticleRef, error) {
	if m.articles != nil {
		return m.articles[editionID], nil
	}
	return nil, nil
}

func (m *mockEditionRepo) ListArticleIDsInAnyNewsletter(ctx context.Context, userID uuid.UUID) ([]uuid.UUID, error) {
	return nil, nil
}

func (m *mockEditionRepo) Duplicate(ctx context.Context, editionID uuid.UUID) (*digest.Edition, error) {
	for _, e := range m.editions {
		if e.ID == editionID {
			dup := &digest.Edition{
				ID:          uuid.New(),
				UserID:      e.UserID,
				Title:       e.Title,
				Status:      digest.EditionBuilding,
				Destination: e.Destination,
				Tags:        append([]string{}, e.Tags...),
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			}
			m.editions = append(m.editions, *dup)
			return dup, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *mockEditionRepo) ListArticleCounts(ctx context.Context, editionIDs []uuid.UUID) (map[uuid.UUID]int, error) {
	result := make(map[uuid.UUID]int, len(editionIDs))
	for _, id := range editionIDs {
		if m.articles != nil {
			result[id] = len(m.articles[id])
		}
	}
	return result, nil
}

func (m *mockEditionRepo) UpdateDestination(ctx context.Context, id uuid.UUID, destination *string) error {
	for i, e := range m.editions {
		if e.ID == id {
			m.editions[i].Destination = destination
			m.editions[i].UpdatedAt = time.Now()
			return nil
		}
	}
	return domain.ErrNotFound
}

func (m *mockEditionRepo) ListUsedDestinations(ctx context.Context, userID uuid.UUID) ([]string, error) {
	return m.usedDests, nil
}

func TestEditionHandler_UpdateStatus_BuildingToReview(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	body := `{"status":"review"}`
	r := httptest.NewRequest(http.MethodPut, "/api/editions/"+eid.String()+"/status", strings.NewReader(body))
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateStatus(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEditionHandler_UpdateStatus_PublishedToBuilding(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionPublished},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	// published → building is allowed as a deliberate reopen.
	body := `{"status":"building"}`
	r := httptest.NewRequest(http.MethodPut, "/api/editions/"+eid.String()+"/status", strings.NewReader(body))
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateStatus(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEditionHandler_Duplicate(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	dest := "Substack"
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{
				ID:          eid,
				UserID:      uid,
				Title:       "Weekly Dev Digest",
				Status:      digest.EditionPublished,
				Destination: &dest,
				Tags:        []string{"tech", "dev"},
			},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	r := httptest.NewRequest(http.MethodPost, "/api/editions/"+eid.String()+"/duplicate", nil)
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Duplicate(w, r)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp editionResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Status != string(digest.EditionBuilding) {
		t.Errorf("expected status building, got %s", resp.Status)
	}
	if resp.Title != "Weekly Dev Digest" {
		t.Errorf("expected title 'Weekly Dev Digest', got %s", resp.Title)
	}
	if resp.Destination == nil || *resp.Destination != "Substack" {
		t.Errorf("expected destination 'Substack', got %v", resp.Destination)
	}
}

func TestEditionHandler_UpdateDestination(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	dest := "Substack"
	body := `{"destination":"Substack"}`
	r := httptest.NewRequest(http.MethodPut, "/api/editions/"+eid.String()+"/destination", strings.NewReader(body))
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateDestination(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	// Verify destination was set
	ed, _ := repo.GetByID(r.Context(), eid)
	if ed.Destination == nil || *ed.Destination != dest {
		t.Errorf("expected destination %q, got %v", dest, ed.Destination)
	}
}

func TestEditionHandler_ListUsedDestinations(t *testing.T) {
	uid := uuid.New()
	repo := &mockEditionRepo{
		editions:  []digest.Edition{},
		usedDests: []string{"Substack", "Blog cliente X"},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	r := httptest.NewRequest(http.MethodGet, "/api/editions/destinations", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.ListDestinations(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var dests []string
	json.NewDecoder(w.Body).Decode(&dests)
	if len(dests) != 2 {
		t.Errorf("expected 2 destinations, got %d", len(dests))
	}
}

// --- List ---

func TestEditionHandler_List_Success(t *testing.T) {
	uid := uuid.New()
	cat := "tech"
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: uuid.New(), UserID: uid, Title: "A", Status: digest.EditionBuilding, Category: &cat},
			{ID: uuid.New(), UserID: uid, Title: "B", Status: digest.EditionReady},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	r := httptest.NewRequest(http.MethodGet, "/api/editions", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.List(w, r)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp []editionResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if len(resp) != 2 {
		t.Errorf("expected 2 editions, got %d", len(resp))
	}
}

func TestEditionHandler_List_FilteredByStatus(t *testing.T) {
	uid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: uuid.New(), UserID: uid, Title: "A", Status: digest.EditionBuilding},
			{ID: uuid.New(), UserID: uid, Title: "B", Status: digest.EditionReady},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	r := httptest.NewRequest(http.MethodGet, "/api/editions?status=building", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.List(w, r)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp []editionResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if len(resp) != 1 {
		t.Errorf("expected 1 edition, got %d", len(resp))
	}
}

func TestEditionHandler_List_TagFilter(t *testing.T) {
	uid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: uuid.New(), UserID: uid, Title: "A", Status: digest.EditionBuilding, Tags: []string{"golang"}},
			{ID: uuid.New(), UserID: uid, Title: "B", Status: digest.EditionBuilding, Tags: []string{"rust"}},
			{ID: uuid.New(), UserID: uid, Title: "C", Status: digest.EditionBuilding, Tags: []string{"golang", "rust"}},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	r := httptest.NewRequest(http.MethodGet, "/api/editions?tag_id=golang", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.List(w, r)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp []editionResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if len(resp) != 2 {
		t.Errorf("expected 2 editions with tag golang, got %d", len(resp))
	}
}

func TestEditionHandler_List_NilEditionsBecomesEmptySlice(t *testing.T) {
	uid := uuid.New()
	h := NewEditionHandler(&mockEditionRepo{}, nil, nil, &application.Plans{})
	r := httptest.NewRequest(http.MethodGet, "/api/editions", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.List(w, r)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if w.Body.String() != "[]\n" {
		t.Errorf("expected empty JSON array, got %q", w.Body.String())
	}
}

// --- Create ---

func TestEditionHandler_Create_Success(t *testing.T) {
	uid := uuid.New()
	repo := &mockEditionRepo{}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	body := `{"title":"My Newsletter"}`
	r := httptest.NewRequest(http.MethodPost, "/api/editions", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Create(w, r)
	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
	var resp editionResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Title != "My Newsletter" {
		t.Errorf("expected title 'My Newsletter', got %q", resp.Title)
	}
	if resp.Status != string(digest.EditionBuilding) {
		t.Errorf("expected status building, got %s", resp.Status)
	}
}

func TestEditionHandler_Create_InvalidBody(t *testing.T) {
	uid := uuid.New()
	h := NewEditionHandler(&mockEditionRepo{}, nil, nil, &application.Plans{})
	r := httptest.NewRequest(http.MethodPost, "/api/editions", strings.NewReader(`not json`))
	r.Header.Set("Content-Type", "application/json")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.Create(w, r)
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

// --- GetByID ---

func TestEditionHandler_GetByID_Success(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test Edition", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	r := httptest.NewRequest(http.MethodGet, "/api/editions/"+eid.String(), nil)
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.GetByID(w, r)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp editionResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.Title != "Test Edition" {
		t.Errorf("expected title 'Test Edition', got %q", resp.Title)
	}
}

func TestEditionHandler_GetByID_InvalidID(t *testing.T) {
	uid := uuid.New()
	h := NewEditionHandler(&mockEditionRepo{}, nil, nil, &application.Plans{})
	r := httptest.NewRequest(http.MethodGet, "/api/editions/not-a-uuid", nil)
	r = addChiURLParam(r, "id", "not-a-uuid")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.GetByID(w, r)
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEditionHandler_GetByID_NotFound(t *testing.T) {
	uid := uuid.New()
	h := NewEditionHandler(&mockEditionRepo{}, nil, nil, &application.Plans{})
	missingID := uuid.New().String()
	r := httptest.NewRequest(http.MethodGet, "/api/editions/"+missingID, nil)
	r = addChiURLParam(r, "id", missingID)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.GetByID(w, r)
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEditionHandler_GetByID_NotOwned(t *testing.T) {
	uid := uuid.New()
	otherID := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: otherID, Title: "Not mine", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	r := httptest.NewRequest(http.MethodGet, "/api/editions/"+eid.String(), nil)
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.GetByID(w, r)
	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

// --- UpdateBody ---

func TestEditionHandler_UpdateBody_Success(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Old", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	body := `{"title":"New Title","body_html":"<p>Hello</p>"}`
	r := httptest.NewRequest(http.MethodPut, "/api/editions/"+eid.String()+"/body", strings.NewReader(body))
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateBody(w, r)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	ed, _ := repo.GetByID(r.Context(), eid)
	if ed.Title != "New Title" {
		t.Errorf("expected title 'New Title', got %q", ed.Title)
	}
}

func TestEditionHandler_UpdateBody_InvalidBody(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	r := httptest.NewRequest(http.MethodPut, "/api/editions/"+eid.String()+"/body", strings.NewReader(`not json`))
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateBody(w, r)
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEditionHandler_UpdateBody_NotFound(t *testing.T) {
	uid := uuid.New()
	h := NewEditionHandler(&mockEditionRepo{}, nil, nil, &application.Plans{})
	missingID := uuid.New().String()
	body := `{"title":"Nope","body_html":""}`
	r := httptest.NewRequest(http.MethodPut, "/api/editions/"+missingID+"/body", strings.NewReader(body))
	r = addChiURLParam(r, "id", missingID)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateBody(w, r)
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEditionHandler_UpdateBody_NotOwned(t *testing.T) {
	uid := uuid.New()
	otherID := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: otherID, Title: "Not mine", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	body := `{"title":"Hacked","body_html":""}`
	r := httptest.NewRequest(http.MethodPut, "/api/editions/"+eid.String()+"/body", strings.NewReader(body))
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateBody(w, r)
	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

// --- UpdateCategory ---

func TestEditionHandler_UpdateCategory_Success(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	cat := "tech"
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	body := `{"category":"tech"}`
	r := httptest.NewRequest(http.MethodPut, "/api/editions/"+eid.String()+"/category", strings.NewReader(body))
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateCategory(w, r)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	ed, _ := repo.GetByID(r.Context(), eid)
	if ed.Category == nil || *ed.Category != cat {
		t.Errorf("expected category %q, got %v", cat, ed.Category)
	}
}

func TestEditionHandler_UpdateCategory_EmptyBecomesNil(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	cat := "tech"
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding, Category: &cat},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	body := `{"category":""}`
	r := httptest.NewRequest(http.MethodPut, "/api/editions/"+eid.String()+"/category", strings.NewReader(body))
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateCategory(w, r)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	ed, _ := repo.GetByID(r.Context(), eid)
	if ed.Category != nil {
		t.Errorf("expected nil category after clearing, got %v", ed.Category)
	}
}

func TestEditionHandler_UpdateCategory_NotFound(t *testing.T) {
	uid := uuid.New()
	h := NewEditionHandler(&mockEditionRepo{}, nil, nil, &application.Plans{})
	missingID := uuid.New().String()
	body := `{"category":"tech"}`
	r := httptest.NewRequest(http.MethodPut, "/api/editions/"+missingID+"/category", strings.NewReader(body))
	r = addChiURLParam(r, "id", missingID)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateCategory(w, r)
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

// --- AddTag ---

func TestEditionHandler_AddTag_Success(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	r := httptest.NewRequest(http.MethodPost, "/api/editions/"+eid.String()+"/tags/golang", nil)
	r = addChiURLParam(r, "id", eid.String())
	r = addChiURLParam(r, "tag", "golang")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.AddTag(w, r)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEditionHandler_AddTag_EmptyTag(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	r := httptest.NewRequest(http.MethodPost, "/api/editions/"+eid.String()+"/tags/", nil)
	r = addChiURLParam(r, "id", eid.String())
	r = addChiURLParam(r, "tag", "")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.AddTag(w, r)
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEditionHandler_AddTag_NotFound(t *testing.T) {
	uid := uuid.New()
	h := NewEditionHandler(&mockEditionRepo{}, nil, nil, &application.Plans{})
	missingID := uuid.New().String()
	r := httptest.NewRequest(http.MethodPost, "/api/editions/"+missingID+"/tags/golang", nil)
	r = addChiURLParam(r, "id", missingID)
	r = addChiURLParam(r, "tag", "golang")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.AddTag(w, r)
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEditionHandler_AddTag_NotOwned(t *testing.T) {
	uid := uuid.New()
	otherID := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: otherID, Title: "Not mine", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	r := httptest.NewRequest(http.MethodPost, "/api/editions/"+eid.String()+"/tags/golang", nil)
	r = addChiURLParam(r, "id", eid.String())
	r = addChiURLParam(r, "tag", "golang")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.AddTag(w, r)
	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

// --- RemoveTag ---

func TestEditionHandler_RemoveTag_Success(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding, Tags: []string{"golang"}},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	r := httptest.NewRequest(http.MethodDelete, "/api/editions/"+eid.String()+"/tags/golang", nil)
	r = addChiURLParam(r, "id", eid.String())
	r = addChiURLParam(r, "tag", "golang")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.RemoveTag(w, r)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEditionHandler_RemoveTag_EmptyTag(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	r := httptest.NewRequest(http.MethodDelete, "/api/editions/"+eid.String()+"/tags/", nil)
	r = addChiURLParam(r, "id", eid.String())
	r = addChiURLParam(r, "tag", "")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.RemoveTag(w, r)
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEditionHandler_RemoveTag_NotFound(t *testing.T) {
	uid := uuid.New()
	h := NewEditionHandler(&mockEditionRepo{}, nil, nil, &application.Plans{})
	missingID := uuid.New().String()
	r := httptest.NewRequest(http.MethodDelete, "/api/editions/"+missingID+"/tags/golang", nil)
	r = addChiURLParam(r, "id", missingID)
	r = addChiURLParam(r, "tag", "golang")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.RemoveTag(w, r)
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEditionHandler_RemoveTag_NotOwned(t *testing.T) {
	uid := uuid.New()
	otherID := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: otherID, Title: "Not mine", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	r := httptest.NewRequest(http.MethodDelete, "/api/editions/"+eid.String()+"/tags/golang", nil)
	r = addChiURLParam(r, "id", eid.String())
	r = addChiURLParam(r, "tag", "golang")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.RemoveTag(w, r)
	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

// --- GenerateIntro ---

func TestEditionHandler_GenerateIntro_Success(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
		},
	}
	jobs := &mockHelpersJobRepo{}
	usages := &mockUsageRepo{usage: 0}
	plans := plansWithMaxGenerations(uid, 10)
	h := NewEditionHandler(repo, jobs, usages, plans)
	r := httptest.NewRequest(http.MethodPost, "/api/editions/"+eid.String()+"/generate-intro", nil)
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.GenerateIntro(w, r)
	if w.Code != http.StatusAccepted {
		t.Errorf("expected 202, got %d: %s", w.Code, w.Body.String())
	}
	var resp map[string]any
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["status"] != "enqueued" {
		t.Errorf("expected status enqueued, got %v", resp["status"])
	}
	if resp["job_id"] == "" {
		t.Errorf("expected non-empty job_id")
	}
}

func TestEditionHandler_GenerateIntro_MissingUserID(t *testing.T) {
	h := NewEditionHandler(&mockEditionRepo{}, nil, nil, &application.Plans{})
	r := httptest.NewRequest(http.MethodPost, "/api/editions/"+uuid.New().String()+"/generate-intro", nil)
	r = addChiURLParam(r, "id", uuid.New().String())
	w := httptest.NewRecorder()
	h.GenerateIntro(w, r)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEditionHandler_GenerateIntro_QuotaExceeded(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
		},
	}
	usages := &mockUsageRepo{usage: 0}
	plans := plansWithMaxGenerations(uid, 0)
	h := NewEditionHandler(repo, nil, usages, plans)
	r := httptest.NewRequest(http.MethodPost, "/api/editions/"+eid.String()+"/generate-intro", nil)
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.GenerateIntro(w, r)
	if w.Code != http.StatusTooManyRequests {
		t.Errorf("expected 429, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEditionHandler_GenerateIntro_NotFound(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	otherID := uuid.New().String()
	r := httptest.NewRequest(http.MethodPost, "/api/editions/"+otherID+"/generate-intro", nil)
	r = addChiURLParam(r, "id", otherID)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.GenerateIntro(w, r)
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

// --- ListArticles ---

func TestEditionHandler_ListArticles_Success(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	cid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
		},
		articles: map[uuid.UUID][]digest.ArticleRef{
			eid: {
				{ContentID: cid, Title: "Article 1", BodyMarkdown: "body", AddedAt: "now"},
			},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	r := httptest.NewRequest(http.MethodGet, "/api/editions/"+eid.String()+"/articles", nil)
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.ListArticles(w, r)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp []digest.ArticleRef
	json.NewDecoder(w.Body).Decode(&resp)
	if len(resp) != 1 {
		t.Errorf("expected 1 article, got %d", len(resp))
	}
	if resp[0].Title != "Article 1" {
		t.Errorf("expected title 'Article 1', got %q", resp[0].Title)
	}
}

func TestEditionHandler_ListArticles_NilArticles(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	r := httptest.NewRequest(http.MethodGet, "/api/editions/"+eid.String()+"/articles", nil)
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.ListArticles(w, r)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	if w.Body.String() != "null\n" {
		t.Errorf("expected null body when articles are nil, got %q", w.Body.String())
	}
}

// --- AddArticle ---

func TestEditionHandler_AddArticle_Success(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	cid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	body := `{"content_id":"` + cid.String() + `"}`
	r := httptest.NewRequest(http.MethodPost, "/api/editions/"+eid.String()+"/articles", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.AddArticle(w, r)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEditionHandler_AddArticle_MissingContentID(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	body := `{}`
	r := httptest.NewRequest(http.MethodPost, "/api/editions/"+eid.String()+"/articles", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.AddArticle(w, r)
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEditionHandler_AddArticle_InvalidContentID(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	body := `{"content_id":"not-a-uuid"}`
	r := httptest.NewRequest(http.MethodPost, "/api/editions/"+eid.String()+"/articles", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.AddArticle(w, r)
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEditionHandler_AddArticle_NotFound(t *testing.T) {
	uid := uuid.New()
	h := NewEditionHandler(&mockEditionRepo{}, nil, nil, &application.Plans{})
	cid := uuid.New().String()
	body := `{"content_id":"` + cid + `"}`
	missingID := uuid.New().String()
	r := httptest.NewRequest(http.MethodPost, "/api/editions/"+missingID+"/articles", strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	r = addChiURLParam(r, "id", missingID)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.AddArticle(w, r)
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

// --- RemoveArticle ---

func TestEditionHandler_RemoveArticle_Success(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	cid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	r := httptest.NewRequest(http.MethodDelete, "/api/editions/"+eid.String()+"/articles/"+cid.String(), nil)
	r = addChiURLParam(r, "id", eid.String())
	r = addChiURLParam(r, "contentID", cid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.RemoveArticle(w, r)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEditionHandler_RemoveArticle_InvalidContentID(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})
	r := httptest.NewRequest(http.MethodDelete, "/api/editions/"+eid.String()+"/articles/not-a-uuid", nil)
	r = addChiURLParam(r, "id", eid.String())
	r = addChiURLParam(r, "contentID", "not-a-uuid")
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.RemoveArticle(w, r)
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEditionHandler_RemoveArticle_NotFound(t *testing.T) {
	uid := uuid.New()
	h := NewEditionHandler(&mockEditionRepo{}, nil, nil, &application.Plans{})
	missingID := uuid.New().String()
	r := httptest.NewRequest(http.MethodDelete, "/api/editions/"+missingID+"/articles/"+uuid.New().String(), nil)
	r = addChiURLParam(r, "id", missingID)
	r = addChiURLParam(r, "contentID", uuid.New().String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.RemoveArticle(w, r)
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}
