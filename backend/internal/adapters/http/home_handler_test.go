package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/domain"
	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

var assertAnError = &errSentinel{msg: "test error"}

type errSentinel struct{ msg string }

func (e *errSentinel) Error() string { return e.msg }

// --- mocks ---

type mockHomeContent struct {
	contents []domain.GeneratedContent
	err      error
}

func (m *mockHomeContent) ListByUser(_ context.Context, _ uuid.UUID) ([]domain.GeneratedContent, error) {
	return m.contents, m.err
}

type mockHomeEditions struct {
	editions []digest.Edition
	err      error
}

func (m *mockHomeEditions) ListByUser(_ context.Context, _ uuid.UUID) ([]digest.Edition, error) {
	return m.editions, m.err
}

type mockHomeIdeas struct {
	ideas []domain.Idea
	err   error
}

func (m *mockHomeIdeas) ListByUser(_ context.Context, _ uuid.UUID) ([]domain.Idea, error) {
	return m.ideas, m.err
}

// --- helpers ---

func homeHandler(mc *mockHomeContent, me *mockHomeEditions, mi *mockHomeIdeas) *HomeHandler {
	return NewHomeHandler(mc, me, mi)
}

func homeRequest(handler http.HandlerFunc) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	r := httptest.NewRequest("GET", "/", nil).WithContext(contextWithUserID(uuid.New()))
	handler(w, r)
	return w
}

// --- tests ---

func TestHomeInsights(t *testing.T) {
	t.Parallel()

	t.Run("unauthorized when no user ID in context", func(t *testing.T) {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("GET", "/", nil)
		h := homeHandler(&mockHomeContent{}, &mockHomeEditions{}, &mockHomeIdeas{})
		h.Insights(w, r)

		if w.Result().StatusCode != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", w.Result().StatusCode)
		}
	})

	t.Run("returns empty insights when no data", func(t *testing.T) {
		w := homeRequest(homeHandler(
			&mockHomeContent{},
			&mockHomeEditions{},
			&mockHomeIdeas{},
		).Insights)

		if w.Result().StatusCode != http.StatusOK {
			t.Errorf("expected 200, got %d", w.Result().StatusCode)
		}

		var insights []Insight
		if err := json.NewDecoder(w.Result().Body).Decode(&insights); err != nil {
			t.Fatalf("decode: %v", err)
		}
		if len(insights) != 0 {
			t.Errorf("expected 0 insights, got %d", len(insights))
		}
	})

	t.Run("returns ideas insight when open ideas exist", func(t *testing.T) {
		w := homeRequest(homeHandler(
			&mockHomeContent{},
			&mockHomeEditions{},
			&mockHomeIdeas{ideas: []domain.Idea{
				{ID: uuid.New(), Status: "open"},
				{ID: uuid.New(), Status: "open"},
				{ID: uuid.New(), Status: "used"},
			}},
		).Insights)

		var insights []Insight
		json.NewDecoder(w.Result().Body).Decode(&insights)

		found := false
		for _, ins := range insights {
			if ins.ID == "ideas-worth-developing" {
				found = true
				break
			}
		}
		if !found {
			t.Error("expected ideas-worth-developing insight")
		}
	})

	t.Run("returns drafts insight when drafts with body exist", func(t *testing.T) {
		body := "a sufficiently long body text that exceeds fifty characters easily"
		w := homeRequest(homeHandler(
			&mockHomeContent{contents: []domain.GeneratedContent{
				{ID: uuid.New(), Status: "draft", BodyMarkdown: &body},
				{ID: uuid.New(), Status: "draft", BodyMarkdown: nil},
				{ID: uuid.New(), Status: "published"},
			}},
			&mockHomeEditions{},
			&mockHomeIdeas{},
		).Insights)

		var insights []Insight
		json.NewDecoder(w.Result().Body).Decode(&insights)

		found := false
		for _, ins := range insights {
			if ins.ID == "drafts-need-references" {
				found = true
				break
			}
		}
		if !found {
			t.Error("expected drafts-need-references insight")
		}
	})

	t.Run("returns newsletter insight when >7 days since last published", func(t *testing.T) {
		w := homeRequest(homeHandler(
			&mockHomeContent{},
			&mockHomeEditions{editions: []digest.Edition{
				{ID: uuid.New(), Status: "published", UpdatedAt: time.Now().Add(-14 * 24 * time.Hour)},
				{ID: uuid.New(), Status: "building", UpdatedAt: time.Now()},
			}},
			&mockHomeIdeas{},
		).Insights)

		var insights []Insight
		json.NewDecoder(w.Result().Body).Decode(&insights)

		found := false
		for _, ins := range insights {
			if ins.ID == "newsletter-overdue" {
				found = true
				break
			}
		}
		if !found {
			t.Error("expected newsletter-overdue insight")
		}
	})

	t.Run("no newsletter insight when published recently", func(t *testing.T) {
		w := homeRequest(homeHandler(
			&mockHomeContent{},
			&mockHomeEditions{editions: []digest.Edition{
				{ID: uuid.New(), Status: "published", UpdatedAt: time.Now().Add(-3 * 24 * time.Hour)},
			}},
			&mockHomeIdeas{},
		).Insights)

		var insights []Insight
		json.NewDecoder(w.Result().Body).Decode(&insights)

		for _, ins := range insights {
			if ins.ID == "newsletter-overdue" {
				t.Error("did not expect newsletter-overdue insight for recent publication")
			}
		}
	})

	t.Run("returns all insights when all conditions met", func(t *testing.T) {
		body := "a sufficiently long body text that exceeds fifty characters easily"
		w := homeRequest(homeHandler(
			&mockHomeContent{contents: []domain.GeneratedContent{
				{ID: uuid.New(), Status: "draft", BodyMarkdown: &body},
			}},
			&mockHomeEditions{editions: []digest.Edition{
				{ID: uuid.New(), Status: "published", UpdatedAt: time.Now().Add(-14 * 24 * time.Hour)},
			}},
			&mockHomeIdeas{ideas: []domain.Idea{
				{ID: uuid.New(), Status: "open"},
			}},
		).Insights)

		var insights []Insight
		json.NewDecoder(w.Result().Body).Decode(&insights)

		if len(insights) != 3 {
			t.Errorf("expected 3 insights, got %d", len(insights))
		}
	})

	t.Run("repo errors are silently ignored", func(t *testing.T) {
		w := homeRequest(homeHandler(
			&mockHomeContent{err: assertAnError},
			&mockHomeEditions{err: assertAnError},
			&mockHomeIdeas{err: assertAnError},
		).Insights)

		if w.Result().StatusCode != http.StatusOK {
			t.Errorf("expected 200, got %d", w.Result().StatusCode)
		}

		var insights []Insight
		json.NewDecoder(w.Result().Body).Decode(&insights)
		if len(insights) != 0 {
			t.Errorf("expected 0 insights on error, got %d", len(insights))
		}
	})
}
