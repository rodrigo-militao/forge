// Package lib provides generic utilities with zero external dependencies.
package lib

import (
	"context"
	"fmt"
	"math/rand"
	"time"
)

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
			lastErr = err
			continue
		}
		return result, nil
	}

	return zero, fmt.Errorf("after %d retries: %w", maxRetries, lastErr)
}
