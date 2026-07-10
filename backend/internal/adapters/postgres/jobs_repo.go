package postgres

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// JobRepository implements ports.JobRepository.
type JobRepository struct {
	pool *pgxpool.Pool
	q    *Queries
}

func NewJobRepository(pool *pgxpool.Pool) *JobRepository {
	return &JobRepository{pool: pool, q: New(pool)}
}

func (r *JobRepository) Create(ctx context.Context, job *domain.Job) error {
	j, err := r.q.CreateJob(ctx, CreateJobParams{
		UserID:  uuidToPgtype(job.UserID),
		Type:    job.Type,
		Payload: job.Payload,
	})
	if err != nil {
		return err
	}
	job.ID = j.ID.Bytes
	job.Status = j.Status
	job.CreatedAt = j.CreatedAt.Time
	job.UpdatedAt = j.UpdatedAt.Time
	return nil
}

func (r *JobRepository) ClaimNext(ctx context.Context) (*domain.Job, error) {
	j, err := r.q.ClaimNextJob(ctx)
	if err != nil {
		return nil, err
	}
	return jobFromModel(j), nil
}

func (r *JobRepository) UpdateStatus(ctx context.Context, id uuid.UUID, status domain.JobStatus, errMsg *string) error {
	_, err := r.q.UpdateJobStatus(ctx, UpdateJobStatusParams{
		ID:     uuidToPgtype(id),
		Status: status,
		Error:  errMsg,
	})
	return err
}

func jobFromModel(j Job) *domain.Job {
	return &domain.Job{
		ID:        j.ID.Bytes,
		UserID:    j.UserID.Bytes,
		Type:      j.Type,
		Status:    j.Status,
		Payload:   j.Payload,
		Error:     j.Error,
		CreatedAt: j.CreatedAt.Time,
		UpdatedAt: j.UpdatedAt.Time,
	}
}

var _ ports.JobRepository = (*JobRepository)(nil)
