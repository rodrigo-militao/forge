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
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// mockHelpersJobRepo implements ports.JobRepository for testing.
type mockHelpersJobRepo struct {
	createErr      error
	findActiveErr  error
	listByUserErr  error
	activeJob      *domain.Job
	createdJob     *domain.Job
	jobs           []domain.Job
	updateStatus   bool // tracks whether UpdateStatus was called
}

func (m *mockHelpersJobRepo) Create(ctx context.Context, job *domain.Job) error {
	if m.createErr != nil {
		return m.createErr
	}
	job.ID = uuid.New()
	m.createdJob = job
	return nil
}

func (m *mockHelpersJobRepo) ClaimNext(ctx context.Context) (*domain.Job, error) { return nil, nil }
func (m *mockHelpersJobRepo) UpdateStatus(_ context.Context, id uuid.UUID, status domain.JobStatus, errMsg *string) error {
	m.updateStatus = true
	for i, j := range m.jobs {
		if j.ID == id {
			m.jobs[i].Status = status
			m.jobs[i].Error = errMsg
			return nil
		}
	}
	return nil
}
func (m *mockHelpersJobRepo) ListByUser(_ context.Context, _ uuid.UUID, _ int) ([]domain.Job, error) {
	return m.jobs, m.listByUserErr
}
func (m *mockHelpersJobRepo) FindActiveByUserAndType(_ context.Context, _ uuid.UUID, _ string) (*domain.Job, error) {
	return m.activeJob, m.findActiveErr
}

// contextWithUserID embeds a uuid.UUID into context using userIDKey.
func contextWithUserID(uid uuid.UUID) context.Context {
	return context.WithValue(context.Background(), userIDKey, uid)
}

// plansWithMaxGenerations builds an application.Plans wired to a mock user repo
// containing a single user with the requested monthly quota.
func plansWithMaxGenerations(uid uuid.UUID, maxGen int) *application.Plans {
	return application.NewPlans(&mockUserRepo{
		users: []domain.User{
			{
				ID:                    uid,
				MaxMonthlyGenerations: maxGen,
			},
		},
	})
}

// --- TestUserIDFromContext ---

func TestUserIDFromContext(t *testing.T) {
	t.Parallel()

	t.Run("returns uuid and ok when key is present with correct type", func(t *testing.T) {
		uid := uuid.New()
		ctx := context.WithValue(context.Background(), userIDKey, uid)
		got, ok := UserIDFromContext(ctx)
		if !ok {
			t.Error("expected ok=true")
		}
		if got != uid {
			t.Errorf("expected %v, got %v", uid, got)
		}
	})

	t.Run("returns uuid.Nil and false when key is missing", func(t *testing.T) {
		ctx := context.Background()
		got, ok := UserIDFromContext(ctx)
		if ok {
			t.Error("expected ok=false")
		}
		if got != uuid.Nil {
			t.Errorf("expected uuid.Nil, got %v", got)
		}
	})

	t.Run("returns uuid.Nil and false when value is wrong type", func(t *testing.T) {
		ctx := context.WithValue(context.Background(), userIDKey, "not-a-uuid")
		got, ok := UserIDFromContext(ctx)
		if ok {
			t.Error("expected ok=false")
		}
		if got != uuid.Nil {
			t.Errorf("expected uuid.Nil, got %v", got)
		}
	})
}

// --- TestEnqueueJob (exercises unexported enqueueJob which calls enqueueJobInner) ---

func TestEnqueueJob(t *testing.T) {
	t.Parallel()
	uid := uuid.New()

	t.Run("unauthorized when no user ID in context", func(t *testing.T) {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("GET", "/", nil)
		handler := enqueueJob(&mockHelpersJobRepo{}, &mockUsageRepo{}, "test_type", false, plansWithMaxGenerations(uid, 100))
		handler(w, r)

		if w.Result().StatusCode != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", w.Result().StatusCode)
		}
	})

	t.Run("quota exceeded returns 429", func(t *testing.T) {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("GET", "/", nil).WithContext(contextWithUserID(uid))
		// MaxMonthlyGenerations=0, Get returns 0 → 0 >= 0 → limit exceeded
		handler := enqueueJob(&mockHelpersJobRepo{}, &mockUsageRepo{usage: 0}, "test_type", false, plansWithMaxGenerations(uid, 0))
		handler(w, r)

		if w.Result().StatusCode != http.StatusTooManyRequests {
			t.Errorf("expected 429, got %d", w.Result().StatusCode)
		}
	})

	t.Run("invalid JSON body with withBody=true returns 400", func(t *testing.T) {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("GET", "/", strings.NewReader("not-json")).WithContext(contextWithUserID(uid))
		r.Header.Set("Content-Type", "application/json")
		handler := enqueueJob(&mockHelpersJobRepo{}, &mockUsageRepo{}, "test_type", true, plansWithMaxGenerations(uid, 100))
		handler(w, r)

		if w.Result().StatusCode != http.StatusBadRequest {
			t.Errorf("expected 400, got %d", w.Result().StatusCode)
		}
	})

	t.Run("job creation failure returns 500", func(t *testing.T) {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("GET", "/", nil).WithContext(contextWithUserID(uid))
		handler := enqueueJob(&mockHelpersJobRepo{createErr: errors.New("db error")}, &mockUsageRepo{}, "test_type", false, plansWithMaxGenerations(uid, 100))
		handler(w, r)

		if w.Result().StatusCode != http.StatusInternalServerError {
			t.Errorf("expected 500, got %d", w.Result().StatusCode)
		}
	})

	t.Run("successful enqueue returns 202 with job_id", func(t *testing.T) {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("GET", "/", nil).WithContext(contextWithUserID(uid))
		handler := enqueueJob(&mockHelpersJobRepo{}, &mockUsageRepo{}, "test_type", false, plansWithMaxGenerations(uid, 100))
		handler(w, r)

		result := w.Result()
		if result.StatusCode != http.StatusAccepted {
			t.Errorf("expected 202, got %d", result.StatusCode)
		}

		var body map[string]string
		if err := json.NewDecoder(result.Body).Decode(&body); err != nil {
			t.Fatalf("decode body: %v", err)
		}
		if body["status"] != "enqueued" {
			t.Errorf("expected 'enqueued', got %s", body["status"])
		}
		if body["job_id"] == "" {
			t.Error("expected non-empty job_id")
		}
	})
}

// --- TestEnqueueDigestJob ---

func TestEnqueueDigestJob(t *testing.T) {
	t.Parallel()
	uid := uuid.New()

	t.Run("unauthorized when no user ID in context", func(t *testing.T) {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("GET", "/", nil)
		handler := EnqueueDigestJob(&mockHelpersJobRepo{}, &mockUsageRepo{}, plansWithMaxGenerations(uid, 100))
		handler(w, r)

		if w.Result().StatusCode != http.StatusUnauthorized {
			t.Errorf("expected 401, got %d", w.Result().StatusCode)
		}
	})

	t.Run("conflict when active job exists returns 409", func(t *testing.T) {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("GET", "/", nil).WithContext(contextWithUserID(uid))
		handler := EnqueueDigestJob(
			&mockHelpersJobRepo{activeJob: &domain.Job{ID: uuid.New(), Status: domain.JobPending}},
			&mockUsageRepo{},
			plansWithMaxGenerations(uid, 100),
		)
		handler(w, r)

		if w.Result().StatusCode != http.StatusConflict {
			t.Errorf("expected 409, got %d", w.Result().StatusCode)
		}
	})

	t.Run("find active job DB error returns 500", func(t *testing.T) {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("GET", "/", nil).WithContext(contextWithUserID(uid))
		handler := EnqueueDigestJob(
			&mockHelpersJobRepo{findActiveErr: errors.New("db error")},
			&mockUsageRepo{},
			plansWithMaxGenerations(uid, 100),
		)
		handler(w, r)

		if w.Result().StatusCode != http.StatusInternalServerError {
			t.Errorf("expected 500, got %d", w.Result().StatusCode)
		}
	})

	t.Run("successful enqueue returns 202", func(t *testing.T) {
		w := httptest.NewRecorder()
		r := httptest.NewRequest("GET", "/", nil).WithContext(contextWithUserID(uid))
		handler := EnqueueDigestJob(&mockHelpersJobRepo{}, &mockUsageRepo{}, plansWithMaxGenerations(uid, 100))
		handler(w, r)

		result := w.Result()
		if result.StatusCode != http.StatusAccepted {
			t.Errorf("expected 202, got %d", result.StatusCode)
		}

		var body map[string]string
		if err := json.NewDecoder(result.Body).Decode(&body); err != nil {
			t.Fatalf("decode body: %v", err)
		}
		if body["status"] != "enqueued" {
			t.Errorf("expected 'enqueued', got %s", body["status"])
		}
		if body["job_id"] == "" {
			t.Error("expected non-empty job_id")
		}
	})
}

// compile-time check that ports is used (referenced via mockHelpersJobRepo implementing JobRepository)
var _ ports.JobRepository = (*mockHelpersJobRepo)(nil)
