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
		ID:                 uuidToPgtype(user.ID),
		Email:              user.Email,
		Name:               user.Name,
		PasswordHash:       user.PasswordHash,
		PlanoAtivo:         user.PlanoAtivo,
		MaxActiveSources:   int32(user.MaxActiveSources),
		MaxActiveInterests: int32(user.MaxActiveInterests),
		Locale:             user.Locale,
	})
	if err != nil {
		return err
	}
	*user = *userFromModel(u)
	return nil
}

func (r *UserRepository) CountActiveSources(ctx context.Context, userID uuid.UUID) (int, error) {
	n, err := r.q.CountActiveSources(ctx, uuidToPgtype(userID))
	return int(n), err
}

func (r *UserRepository) CountActiveInterests(ctx context.Context, userID uuid.UUID) (int, error) {
	n, err := r.q.CountActiveInterests(ctx, uuidToPgtype(userID))
	return int(n), err
}

func (r *UserRepository) UpdateRestrictSearch(ctx context.Context, userID uuid.UUID, restrict bool) error {
	_, err := r.q.UpdateRestrictSearch(ctx, UpdateRestrictSearchParams{
		ID:                     uuidToPgtype(userID),
		RestrictSearchToSources: restrict,
	})
	return err
}

func (r *UserRepository) UpdateThemePreference(ctx context.Context, userID uuid.UUID, theme domain.ThemePreference) error {
	_, err := r.q.UpdateThemePreference(ctx, UpdateThemePreferenceParams{
		ID:              uuidToPgtype(userID),
		ThemePreference: theme,
	})
	return err
}

func userFromModel(u User) *domain.User {
	return &domain.User{
		ID:                      u.ID.Bytes,
		Email:                   u.Email,
		PasswordHash:            u.PasswordHash,
		Name:                    u.Name,
		PlanoAtivo:              u.PlanoAtivo,
		MaxActiveSources:        int(u.MaxActiveSources),
		MaxActiveInterests:      int(u.MaxActiveInterests),
		RestrictSearchToSources: u.RestrictSearchToSources,
		MaxMonthlyGenerations:   int(u.MaxMonthlyGenerations),
		Locale:                  u.Locale,
		ThemePreference:         u.ThemePreference,
		CreatedAt:               u.CreatedAt.Time,
		UpdatedAt:               u.UpdatedAt.Time,
	}
}

var _ ports.UserRepository = (*UserRepository)(nil)
