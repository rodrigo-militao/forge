package worker

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/domain"
)

// mockJobRepo implements ports.JobRepository for testing.
type mockJobRepo struct {
	claimFn       func(ctx context.Context) (*domain.Job, error)
	lastStatus    domain.JobStatus
	lastErrMsg    *string
}

func (m *mockJobRepo) Create(ctx context.Context, job *domain.Job) error { return nil }
func (m *mockJobRepo) ClaimNext(ctx context.Context) (*domain.Job, error) {
	if m.claimFn != nil {
		return m.claimFn(ctx)
	}
	return nil, nil
}
func (m *mockJobRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.JobStatus, errMsg *string) error {
	m.lastStatus = status
	m.lastErrMsg = errMsg
	return nil
}

func TestProcessNext_Success(t *testing.T) {
	handled := false
	repo := &mockJobRepo{
		claimFn: func(context.Context) (*domain.Job, error) {
			return &domain.Job{ID: uuid.New(), Type: "test", UserID: uuid.New()}, nil
		},
	}
	r := NewRunner(repo, time.Second)
	r.Register("test", func(ctx context.Context, userID string, payload []byte) error {
		handled = true
		return nil
	})
	notified := false
	r.NotifyFunc = func(ctx context.Context, userID string) {
		notified = true
	}

	r.processNext(context.Background())
	if !handled {
		t.Error("handler was not called")
	}
	if repo.lastStatus != domain.JobDone {
		t.Errorf("expected JobDone, got %s", repo.lastStatus)
	}
	if !notified {
		t.Error("NotifyFunc was not called on success")
	}
}

func TestProcessNext_UnknownJobType(t *testing.T) {
	repo := &mockJobRepo{
		claimFn: func(context.Context) (*domain.Job, error) {
			return &domain.Job{ID: uuid.New(), Type: "unknown", UserID: uuid.New()}, nil
		},
	}
	r := NewRunner(repo, time.Second)

	r.processNext(context.Background())
	if repo.lastStatus != domain.JobFailed {
		t.Errorf("expected JobFailed, got %s", repo.lastStatus)
	}
}

func TestProcessNext_HandlerError(t *testing.T) {
	repo := &mockJobRepo{
		claimFn: func(context.Context) (*domain.Job, error) {
			return &domain.Job{ID: uuid.New(), Type: "errjob", UserID: uuid.New()}, nil
		},
	}
	r := NewRunner(repo, time.Second)
	r.Register("errjob", func(ctx context.Context, userID string, payload []byte) error {
		return errors.New("something went wrong")
	})

	r.processNext(context.Background())
	if repo.lastStatus != domain.JobFailed {
		t.Errorf("expected JobFailed, got %s", repo.lastStatus)
	}
	if repo.lastErrMsg == nil || *repo.lastErrMsg != "something went wrong" {
		t.Errorf("expected error message, got %v", repo.lastErrMsg)
	}
}

func TestProcessNext_ClaimNextError(t *testing.T) {
	repo := &mockJobRepo{
		claimFn: func(context.Context) (*domain.Job, error) {
			return nil, errors.New("db error")
		},
	}
	r := NewRunner(repo, time.Second)

	// Should not panic, should just return silently
	r.processNext(context.Background())
}
