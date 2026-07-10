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

// UserRepository implements ports.UserRepository.
type UserRepository struct {
	pool *pgxpool.Pool
	q    *Queries
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
	return &UserRepository{pool: pool, q: New(pool)}
}

func (r *UserRepository) Create(ctx context.Context, user *domain.User) error {
	u, err := r.q.CreateUser(ctx, CreateUserParams{
		Email:        user.Email,
		PasswordHash: user.PasswordHash,
		Name:         user.Name,
		Locale:       user.Locale,
	})
	if err != nil {
		return err
	}
	*user = *userFromModel(u)
	return nil
}

func (r *UserRepository) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	u, err := r.q.GetUserByID(ctx, uuidToPgtype(id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return userFromModel(u), nil
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	u, err := r.q.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return userFromModel(u), nil
}

func (r *UserRepository) Update(ctx context.Context, user *domain.User) error {
	u, err := r.q.UpdateUser(ctx, UpdateUserParams{
		ID:           uuidToPgtype(user.ID),
		Email:        user.Email,
		Name:         user.Name,
		PasswordHash: user.PasswordHash,
		PlanoAtivo:   user.PlanoAtivo,
		Locale:       user.Locale,
	})
	if err != nil {
		return err
	}
	*user = *userFromModel(u)
	return nil
}

func userFromModel(u User) *domain.User {
	return &domain.User{
		ID:           u.ID.Bytes,
		Email:        u.Email,
		PasswordHash: u.PasswordHash,
		Name:         u.Name,
		PlanoAtivo:   u.PlanoAtivo,
		Locale:       u.Locale,
		CreatedAt:    u.CreatedAt.Time,
		UpdatedAt:    u.UpdatedAt.Time,
	}
}

var _ ports.UserRepository = (*UserRepository)(nil)
