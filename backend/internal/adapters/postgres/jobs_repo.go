package postgres

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
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

func (r *JobRepository) ListByUser(ctx context.Context, userID uuid.UUID, limit int) ([]domain.Job, error) {
	rows, err := r.q.ListJobsByUser(ctx, ListJobsByUserParams{
		UserID: uuidToPgtype(userID),
		Limit:  int32(limit),
	})
	if err != nil {
		return nil, err
	}
	jobs := make([]domain.Job, len(rows))
	for i, row := range rows {
		jobs[i] = *jobFromModel(row)
	}
	return jobs, nil
}

func (r *JobRepository) FindActiveByUserAndType(ctx context.Context, userID uuid.UUID, jobType string) (*domain.Job, error) {
	row, err := r.q.FindActiveDigestJob(ctx, uuidToPgtype(userID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return jobFromModel(row), nil
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
