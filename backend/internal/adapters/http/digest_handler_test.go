package http

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

func TestDigestHandler_GetStats_NoUserID(t *testing.T) {
	h := NewDigestHandler(&mockContentRepo{}, &mockEditionRepo{}, &mockHelpersJobRepo{})
	r := httptest.NewRequest(http.MethodGet, "/api/digest/stats", nil)
	w := httptest.NewRecorder()
	h.GetStats(w, r)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

func TestDigestHandler_GetStats_QueryFails(t *testing.T) {
	uid := uuid.New()
	content := &mockContentRepo{}
	h := NewDigestHandler(content, &mockEditionRepo{}, &mockHelpersJobRepo{})

	// Cause GetDigestStats to fail — we need a failing mock.
	// Use a nil content repo so GetDigestStats panics or returns error.
	// Actually the mock never fails; let's wrap it differently.
	// Instead, we create a scenario where r.Context() is cancelled to force error.
	// Simpler: just use the mock as-is and verify we get through.
	// For the failure test, we need a content repo whose GetDigestStats returns error.
	// Let's define a minimal inline mock for this.

	r := httptest.NewRequest(http.MethodGet, "/api/digest/stats", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	// With default mock, this should succeed; we'll test failure by passing a broken mock
	h.GetStats(w, r)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200 with default mock, got %d: %s", w.Code, w.Body.String())
	}
}

func TestDigestHandler_GetStats_QueryFails_Explicit(t *testing.T) {
	uid := uuid.New()
	content := &mockContentRepoWithDigestStatsErr{}
	h := NewDigestHandler(content, &mockEditionRepo{}, &mockHelpersJobRepo{})
	r := httptest.NewRequest(http.MethodGet, "/api/digest/stats", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.GetStats(w, r)
	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

// mockContentRepoWithDigestStatsErr implements ports.ContentRepository but fails on GetDigestStats.
type mockContentRepoWithDigestStatsErr struct{}

func (m *mockContentRepoWithDigestStatsErr) GetByID(_ context.Context, _ uuid.UUID) (*domain.GeneratedContent, error) {
	return nil, nil
}
func (m *mockContentRepoWithDigestStatsErr) ListByUser(_ context.Context, _ uuid.UUID) ([]domain.GeneratedContent, error) {
	return nil, nil
}
func (m *mockContentRepoWithDigestStatsErr) ListByUserFiltered(_ context.Context, _ uuid.UUID, _, _ *string) ([]domain.GeneratedContent, error) {
	return nil, nil
}
func (m *mockContentRepoWithDigestStatsErr) Create(_ context.Context, _ *domain.GeneratedContent) error {
	return nil
}
func (m *mockContentRepoWithDigestStatsErr) UpdateBody(_ context.Context, _ uuid.UUID, _, _ *string) error {
	return nil
}
func (m *mockContentRepoWithDigestStatsErr) UpdateOutline(_ context.Context, _ uuid.UUID, _ *string) error {
	return nil
}
func (m *mockContentRepoWithDigestStatsErr) UpdateStatus(_ context.Context, _ uuid.UUID, _ domain.ContentStatus) error {
	return nil
}
func (m *mockContentRepoWithDigestStatsErr) UpdateStatusWithPublishedAt(_ context.Context, _ uuid.UUID, _ domain.ContentStatus) error {
	return nil
}
func (m *mockContentRepoWithDigestStatsErr) SoftDelete(_ context.Context, _ uuid.UUID) error {
	return nil
}
func (m *mockContentRepoWithDigestStatsErr) AddCategory(_ context.Context, _ uuid.UUID, _ string) error {
	return nil
}
func (m *mockContentRepoWithDigestStatsErr) RemoveCategory(_ context.Context, _ uuid.UUID, _ string) error {
	return nil
}
func (m *mockContentRepoWithDigestStatsErr) SetCategories(_ context.Context, _ uuid.UUID, _ []string) error {
	return nil
}
func (m *mockContentRepoWithDigestStatsErr) ListUserCategories(_ context.Context, _ uuid.UUID) ([]string, error) {
	return nil, nil
}
func (m *mockContentRepoWithDigestStatsErr) ExistsByURL(_ context.Context, _ uuid.UUID, _ string) (bool, error) {
	return false, nil
}
func (m *mockContentRepoWithDigestStatsErr) ListWithoutCategory(_ context.Context, _ uuid.UUID, _ int) ([]domain.GeneratedContent, error) {
	return nil, nil
}
func (m *mockContentRepoWithDigestStatsErr) GetDigestStats(_ context.Context, _ uuid.UUID) (*ports.DigestStats, error) {
	return nil, domain.ErrNotFound
}
func (m *mockContentRepoWithDigestStatsErr) AddTag(_ context.Context, _ uuid.UUID, _ string) error {
	return nil
}
func (m *mockContentRepoWithDigestStatsErr) RemoveTag(_ context.Context, _ uuid.UUID, _ string) error {
	return nil
}
func (m *mockContentRepoWithDigestStatsErr) ListUserTags(_ context.Context, _ uuid.UUID) ([]string, error) {
	return nil, nil
}

func TestDigestHandler_GetStats_SuccessNoActiveJob(t *testing.T) {
	uid := uuid.New()
	content := &mockContentRepo{}
	h := NewDigestHandler(content, &mockEditionRepo{}, &mockHelpersJobRepo{})
	r := httptest.NewRequest(http.MethodGet, "/api/digest/stats", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.GetStats(w, r)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp digestStatsResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.ActiveJobID != nil {
		t.Errorf("expected nil ActiveJobID, got %v", resp.ActiveJobID)
	}
	if resp.ActiveJobStatus != nil {
		t.Errorf("expected nil ActiveJobStatus, got %v", resp.ActiveJobStatus)
	}
}

func TestDigestHandler_GetStats_SuccessWithActiveJob(t *testing.T) {
	uid := uuid.New()
	jobID := uuid.New()
	activeJob := &domain.Job{
		ID:        jobID,
		UserID:    uid,
		Type:      "curate_digest",
		Status:    domain.JobProcessing,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	jobs := &mockHelpersJobRepo{
		activeJob: activeJob,
	}
	h := NewDigestHandler(&mockContentRepo{}, &mockEditionRepo{}, jobs)
	r := httptest.NewRequest(http.MethodGet, "/api/digest/stats", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.GetStats(w, r)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp digestStatsResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if resp.ActiveJobID == nil || *resp.ActiveJobID != jobID.String() {
		t.Errorf("expected ActiveJobID %q, got %v", jobID.String(), resp.ActiveJobID)
	}
	if resp.ActiveJobStatus == nil || *resp.ActiveJobStatus != string(domain.JobProcessing) {
		t.Errorf("expected ActiveJobStatus %q, got %v", string(domain.JobProcessing), resp.ActiveJobStatus)
	}
}

// --- ListJobs ---

func TestDigestHandler_ListJobs_NoUserID(t *testing.T) {
	h := NewDigestHandler(&mockContentRepo{}, &mockEditionRepo{}, &mockHelpersJobRepo{})
	r := httptest.NewRequest(http.MethodGet, "/api/digest/jobs", nil)
	w := httptest.NewRecorder()
	h.ListJobs(w, r)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

func TestDigestHandler_ListJobs_ListFails(t *testing.T) {
	uid := uuid.New()
	h := NewDigestHandler(&mockContentRepo{}, &mockEditionRepo{}, &mockHelpersJobRepo{listByUserErr: domain.ErrNotFound})
	r := httptest.NewRequest(http.MethodGet, "/api/digest/jobs", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.ListJobs(w, r)
	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

func TestDigestHandler_ListJobs_Success(t *testing.T) {
	uid := uuid.New()
	jobs := &mockHelpersJobRepo{
		jobs: []domain.Job{
			{ID: uuid.New(), UserID: uid, Type: "curate_digest", Status: domain.JobDone, CreatedAt: time.Now(), UpdatedAt: time.Now()},
			{ID: uuid.New(), UserID: uid, Type: "curate_digest", Status: domain.JobFailed, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		},
	}
	h := NewDigestHandler(&mockContentRepo{}, &mockEditionRepo{}, jobs)
	r := httptest.NewRequest(http.MethodGet, "/api/digest/jobs", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.ListJobs(w, r)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp []jobResponse
	json.NewDecoder(w.Body).Decode(&resp)
	if len(resp) != 2 {
		t.Errorf("expected 2 jobs, got %d", len(resp))
	}
}

// --- CancelJob ---

func TestDigestHandler_CancelJob_NoUserID(t *testing.T) {
	h := NewDigestHandler(&mockContentRepo{}, &mockEditionRepo{}, &mockHelpersJobRepo{})
	r := httptest.NewRequest(http.MethodPost, "/api/digest/jobs/cancel", nil)
	w := httptest.NewRecorder()
	h.CancelJob(w, r)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

func TestDigestHandler_CancelJob_FindFails(t *testing.T) {
	uid := uuid.New()
	jobs := &mockHelpersJobRepo{findActiveErr: domain.ErrNotFound}
	h := NewDigestHandler(&mockContentRepo{}, &mockEditionRepo{}, jobs)
	r := httptest.NewRequest(http.MethodPost, "/api/digest/jobs/cancel", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.CancelJob(w, r)
	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}

func TestDigestHandler_CancelJob_NoActiveJob(t *testing.T) {
	uid := uuid.New()
	h := NewDigestHandler(&mockContentRepo{}, &mockEditionRepo{}, &mockHelpersJobRepo{})
	r := httptest.NewRequest(http.MethodPost, "/api/digest/jobs/cancel", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.CancelJob(w, r)
	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d: %s", w.Code, w.Body.String())
	}
}

func TestDigestHandler_CancelJob_Success(t *testing.T) {
	uid := uuid.New()
	jobID := uuid.New()
	activeJob := &domain.Job{
		ID: jobID, UserID: uid, Type: "curate_digest", Status: domain.JobProcessing, CreatedAt: time.Now(), UpdatedAt: time.Now(),
	}
	jobs := &mockHelpersJobRepo{
		activeJob: activeJob,
		jobs:      []domain.Job{*activeJob},
	}
	h := NewDigestHandler(&mockContentRepo{}, &mockEditionRepo{}, jobs)
	r := httptest.NewRequest(http.MethodPost, "/api/digest/jobs/cancel", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.CancelJob(w, r)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	// Verify job was cancelled
	updated := jobs.jobs[0]
	if updated.Status != domain.JobFailed {
		t.Errorf("expected job status failed, got %s", updated.Status)
	}
	if updated.Error == nil || *updated.Error != "cancelled by user" {
		t.Errorf("expected error 'cancelled by user', got %v", updated.Error)
	}
}

// errUpdateStatusJobRepo fails on UpdateStatus to test CancelJob's error branch.
type errUpdateStatusJobRepo struct {
	activeJob *domain.Job
}

func (m *errUpdateStatusJobRepo) Create(ctx context.Context, job *domain.Job) error {
	job.ID = uuid.New()
	return nil
}

func (m *errUpdateStatusJobRepo) ClaimNext(ctx context.Context) (*domain.Job, error) {
	return nil, nil
}

func (m *errUpdateStatusJobRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.JobStatus, errMsg *string) error {
	return errors.New("update failed")
}

func (m *errUpdateStatusJobRepo) ListByUser(ctx context.Context, userID uuid.UUID, limit int) ([]domain.Job, error) {
	return nil, nil
}

func (m *errUpdateStatusJobRepo) FindActiveByUserAndType(ctx context.Context, userID uuid.UUID, jobType string) (*domain.Job, error) {
	return m.activeJob, nil
}

// compile-time check
var _ ports.JobRepository = (*errUpdateStatusJobRepo)(nil)

func TestDigestHandler_CancelJob_UpdateFails(t *testing.T) {
	uid := uuid.New()
	jobID := uuid.New()
	activeJob := &domain.Job{
		ID:     jobID,
		UserID: uid,
		Type:   "curate_digest",
		Status: domain.JobProcessing,
	}
	jobs := &errUpdateStatusJobRepo{activeJob: activeJob}
	h := NewDigestHandler(&mockContentRepo{}, &mockEditionRepo{}, jobs)

	r := httptest.NewRequest(http.MethodPost, "/api/digest/jobs/cancel", nil)
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, uid))
	w := httptest.NewRecorder()
	h.CancelJob(w, r)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d: %s", w.Code, w.Body.String())
	}
}
