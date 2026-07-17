// Package domain holds enterprise-wide entities and value objects.
// Zero imports of infrastructure — pure Go.
package domain

import "errors"

var (
	ErrNotFound      = errors.New("resource not found")
	ErrAlreadyExists = errors.New("resource already exists")
	ErrInvalidInput  = errors.New("invalid input")
	ErrNotOwned      = errors.New("resource does not belong to user")
)
