// Package worker polls the jobs table and processes async jobs (ADR 0028).
package worker

import (
	"context"
	"log/slog"
	"time"

	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
	"github.com/rodrigo-militao/forge/internal/lib"
)

// Runner polls the jobs table at a fixed interval and processes jobs.
type Runner struct {
	jobs       ports.JobRepository
	handlers   map[string]Handler
	interval   time.Duration
	NotifyFunc func(ctx context.Context, userID string) // called after each successful job
}

// Handler processes a single job type.
type Handler func(ctx context.Context, userID string, payload []byte) error

// NewRunner creates a job runner.
func NewRunner(jobs ports.JobRepository, interval time.Duration) *Runner {
	return &Runner{
		jobs:     jobs,
		handlers: make(map[string]Handler),
		interval: interval,
	}
}

// Register adds a handler for a job type.
func (r *Runner) Register(jobType string, fn Handler) {
	r.handlers[jobType] = fn
}

// Run starts the polling loop. Blocks until ctx is cancelled.
func (r *Runner) Run(ctx context.Context) {
	slog.Info("worker started", "poll_interval", r.interval)

	ticker := time.NewTicker(r.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			slog.Info("worker stopped")
			return
		case <-ticker.C:
			r.processNext(ctx)
		}
	}
}

func (r *Runner) processNext(ctx context.Context) {
	job, err := r.jobs.ClaimNext(ctx)
	if err != nil {
		return
	}

	handler, ok := r.handlers[job.Type]
	if !ok {
		lib.LogAttrs(ctx, slog.LevelError, "no handler for job type",
			slog.String("job_id", job.ID.String()),
			slog.String("job_type", job.Type),
		)
		r.jobs.UpdateStatus(ctx, job.ID, domain.JobFailed, strPtr("unknown job type"))
		return
	}

	lib.LogAttrs(ctx, slog.LevelInfo, "processing job",
		slog.String("job_id", job.ID.String()),
		slog.String("job_type", job.Type),
	)

	if err := handler(ctx, job.UserID.String(), job.Payload); err != nil {
		lib.LogAttrs(ctx, slog.LevelError, "job failed",
			slog.String("job_id", job.ID.String()),
			slog.String("error", err.Error()),
		)
		errMsg := err.Error()
		r.jobs.UpdateStatus(ctx, job.ID, domain.JobFailed, &errMsg)
		return
	}

	r.jobs.UpdateStatus(ctx, job.ID, domain.JobDone, nil)
	lib.LogAttrs(ctx, slog.LevelInfo, "job completed",
		slog.String("job_id", job.ID.String()),
	)

	if r.NotifyFunc != nil {
		r.NotifyFunc(ctx, job.UserID.String())
	}
}

// strPtr is a helper to convert string to *string.
func strPtr(s string) *string { return &s }
