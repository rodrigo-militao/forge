// Package lib provides generic utilities with zero external dependencies.
package lib

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"time"
)

// stopRetry wraps an error to signal that Do should not retry.
type stopRetry struct {
	err error
}

func (s *stopRetry) Error() string  { return s.err.Error() }
func (s *stopRetry) Unwrap() error  { return s.err }

// StopRetry wraps err so that Do returns it immediately without retrying.
func StopRetry(err error) error { return &stopRetry{err: err} }

// Do runs fn up to maxRetries times with exponential backoff and jitter.
// Returns the first successful result, or the last error if all retries fail.
func Do[T any](ctx context.Context, maxRetries int, fn func() (T, error)) (T, error) {
	var lastErr error
	var zero T

	for attempt := 0; attempt <= maxRetries; attempt++ {
		if attempt > 0 {
			backoff := time.Duration(100*attempt*attempt) * time.Millisecond
			jitter := time.Duration(rand.Int63n(int64(backoff) / 2))
			select {
			case <-ctx.Done():
				return zero, ctx.Err()
			case <-time.After(backoff + jitter):
			}
		}

		result, err := fn()
		if err != nil {
			var stop *stopRetry
			if errors.As(err, &stop) {
				return zero, stop.err
			}
			lastErr = err
			continue
		}
		return result, nil
	}

	return zero, fmt.Errorf("after %d retries: %w", maxRetries, lastErr)
}
