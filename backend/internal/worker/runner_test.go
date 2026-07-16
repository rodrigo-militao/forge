package worker

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/core/domain"
)

// mockJobRepo implements ports.JobRepository for testing.
type mockJobRepo struct {
	claimFn    func(ctx context.Context) (*domain.Job, error)
	lastStatus domain.JobStatus
	lastErrMsg *string
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
func (m *mockJobRepo) ListByUser(ctx context.Context, userID uuid.UUID, limit int) ([]domain.Job, error) { return nil, nil }
func (m *mockJobRepo) FindActiveByUserAndType(ctx context.Context, userID uuid.UUID, jobType string) (*domain.Job, error) {
	return nil, nil
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

func TestProcessNext_claimNextReturnsNil(t *testing.T) {
	repo := &mockJobRepo{
		claimFn: func(context.Context) (*domain.Job, error) {
			return nil, nil // no jobs available
		},
	}
	r := NewRunner(repo, time.Second)

	// Should not panic, should return silently
	r.processNext(context.Background())
}

func TestProcessNext_handlerPanic(t *testing.T) {
	repo := &mockJobRepo{
		claimFn: func(context.Context) (*domain.Job, error) {
			return &domain.Job{ID: uuid.New(), Type: "panicjob", UserID: uuid.New()}, nil
		},
	}
	r := NewRunner(repo, time.Second)
	r.Register("panicjob", func(ctx context.Context, userID string, payload []byte) error {
		panic("something bad happened")
	})

	r.processNext(context.Background())
	if repo.lastStatus != domain.JobFailed {
		t.Errorf("expected JobFailed after panic, got %s", repo.lastStatus)
	}
	if repo.lastErrMsg == nil || !strings.Contains(*repo.lastErrMsg, "panic") {
		t.Errorf("expected error message to mention panic, got %v", repo.lastErrMsg)
	}
}

func TestProcessNext_handlerPanicWithNil(t *testing.T) {
	repo := &mockJobRepo{
		claimFn: func(context.Context) (*domain.Job, error) {
			return &domain.Job{ID: uuid.New(), Type: "nilpanic", UserID: uuid.New()}, nil
		},
	}
	r := NewRunner(repo, time.Second)
	r.Register("nilpanic", func(ctx context.Context, userID string, payload []byte) error {
		var p *int
		_ = *p // deliberate nil pointer dereference
		return nil
	})

	r.processNext(context.Background())
	if repo.lastStatus != domain.JobFailed {
		t.Errorf("expected JobFailed after nil panic, got %s", repo.lastStatus)
	}
	if repo.lastErrMsg == nil {
		t.Fatal("expected error message after panic")
	}
}

func TestProcessNext_handlerUpdatesJobStatusOnSuccess(t *testing.T) {
	repo := &mockJobRepo{
		claimFn: func(context.Context) (*domain.Job, error) {
			return &domain.Job{ID: uuid.New(), Type: "test", UserID: uuid.New()}, nil
		},
	}
	r := NewRunner(repo, time.Second)
	r.Register("test", func(ctx context.Context, userID string, payload []byte) error {
		return nil
	})

	r.processNext(context.Background())
	if repo.lastStatus != domain.JobDone {
		t.Errorf("expected JobDone, got %s", repo.lastStatus)
	}
	if repo.lastErrMsg != nil {
		t.Errorf("expected nil errMsg for success, got %v", *repo.lastErrMsg)
	}
}

func TestProcessNext_handlerUpdatesJobStatusOnFailure(t *testing.T) {
	repo := &mockJobRepo{
		claimFn: func(context.Context) (*domain.Job, error) {
			return &domain.Job{ID: uuid.New(), Type: "failjob", UserID: uuid.New()}, nil
		},
	}
	r := NewRunner(repo, time.Second)
	r.Register("failjob", func(ctx context.Context, userID string, payload []byte) error {
		return errors.New("handler error")
	})

	r.processNext(context.Background())
	if repo.lastStatus != domain.JobFailed {
		t.Errorf("expected JobFailed, got %s", repo.lastStatus)
	}
	if repo.lastErrMsg == nil {
		t.Fatal("expected non-nil errMsg for failure")
	}
}

func TestRegister_duplicateType_replaces(t *testing.T) {
	repo := &mockJobRepo{
		claimFn: func(context.Context) (*domain.Job, error) {
			return &domain.Job{ID: uuid.New(), Type: "test", UserID: uuid.New()}, nil
		},
	}
	r := NewRunner(repo, time.Second)

	// Register first handler that would fail.
	r.Register("test", func(ctx context.Context, userID string, payload []byte) error {
		return errors.New("old handler")
	})

	// Register second handler that succeeds — should replace the first.
	r.Register("test", func(ctx context.Context, userID string, payload []byte) error {
		return nil
	})

	r.processNext(context.Background())
	if repo.lastStatus != domain.JobDone {
		t.Errorf("expected JobDone (replaced handler should succeed), got %s", repo.lastStatus)
	}
}

func TestRegister_multipleTypes(t *testing.T) {
	repo := &mockJobRepo{
		claimFn: func(context.Context) (*domain.Job, error) {
			return &domain.Job{ID: uuid.New(), Type: "type-a", UserID: uuid.New()}, nil
		},
	}
	r := NewRunner(repo, time.Second)

	var called string
	r.Register("type-a", func(ctx context.Context, userID string, payload []byte) error {
		called = "type-a"
		return nil
	})
	r.Register("type-b", func(ctx context.Context, userID string, payload []byte) error {
		called = "type-b"
		return nil
	})

	r.processNext(context.Background())
	if called != "type-a" {
		t.Errorf("expected handler 'type-a' to be called, got '%s'", called)
	}
}

func TestRun_contextCancellation(t *testing.T) {
	repo := &mockJobRepo{}
	r := NewRunner(repo, 10*time.Millisecond)

	ctx, cancel := context.WithCancel(context.Background())

	done := make(chan struct{})
	go func() {
		r.Run(ctx)
		close(done)
	}()

	// Let it run a couple of polling ticks, then cancel.
	time.Sleep(25 * time.Millisecond)
	cancel()

	select {
	case <-done:
		// OK — Run returned after context cancellation.
	case <-time.After(time.Second):
		t.Fatal("Run did not stop after context cancellation")
	}
}

func TestRun_immediateCancellation(t *testing.T) {
	repo := &mockJobRepo{}
	r := NewRunner(repo, time.Hour) // long interval, should never tick

	ctx, cancel := context.WithCancel(context.Background())
	cancel() // cancel before Run starts

	done := make(chan struct{})
	go func() {
		r.Run(ctx)
		close(done)
	}()

	select {
	case <-done:
		// OK — Run returned immediately.
	case <-time.After(time.Second):
		t.Fatal("Run did not stop after immediate cancellation")
	}
}
