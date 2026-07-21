// Package domain holds enterprise-wide entities and value objects.
// Zero imports of infrastructure — pure Go.
package domain

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
)

var (
	ErrNotFound      = errors.New("resource not found")
	ErrAlreadyExists = errors.New("resource already exists")
	ErrInvalidInput  = errors.New("invalid input")
	ErrNotOwned      = errors.New("resource does not belong to user")
)

// Owned is implemented by entities that have a UserID, enabling
// the generic RequireOwnership helper.
type Owned interface {
	GetUserID() uuid.UUID
}

// RequireOwnership fetches an entity and checks that it belongs to userID.
// On mismatch it returns ErrNotOwned wrapped with ErrNotFound (to hide
// the resource's existence from unauthorized callers).
func RequireOwnership[T Owned](ctx context.Context, fetch func(context.Context) (T, error), userID uuid.UUID) (T, error) {
	entity, err := fetch(ctx)
	if err != nil {
		var zero T
		return zero, err
	}
	if entity.GetUserID() != userID {
		var zero T
		return zero, fmt.Errorf("%w: %w", ErrNotOwned, ErrNotFound)
	}
	return entity, nil
}
