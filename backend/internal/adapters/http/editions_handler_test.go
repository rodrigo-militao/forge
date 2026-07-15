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

func TestEditionHandler_UpdateStatus_BuildingToReady(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionBuilding},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	body := `{"status":"ready"}`
	r := httptest.NewRequest(http.MethodPut, "/api/editions/"+eid.String()+"/status", strings.NewReader(body))
	r = addChiURLParam(r, "id", eid.String())
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.UpdateStatus(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEditionHandler_UpdateStatus_AnyCrossStatus(t *testing.T) {
	uid := uuid.New()
	eid := uuid.New()
	repo := &mockEditionRepo{
		editions: []digest.Edition{
			{ID: eid, UserID: uid, Title: "Test", Status: digest.EditionPublished},
		},
	}
	h := NewEditionHandler(repo, nil, nil, &application.Plans{})

	// All cross-status transitions are valid (free kanban movement).
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
