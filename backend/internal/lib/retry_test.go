package lib

import (
	"context"
	"errors"
	"testing"
)

func TestDo_retries_on_error_then_succeeds(t *testing.T) {
	t.Parallel()

	var attempts int
	want := "ok"

	got, err := Do(context.Background(), 3, func() (string, error) {
		attempts++
		if attempts < 2 {
			return "", errors.New("not yet")
		}
		return want, nil
	})

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
	if attempts != 2 {
		t.Fatalf("expected 2 attempts, got %d", attempts)
	}
}

func TestDo_returns_error_after_max_retries(t *testing.T) {
	t.Parallel()

	_, err := Do(context.Background(), 2, func() (string, error) {
		return "", errors.New("persistent error")
	})

	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestDo_respects_context_cancellation(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := Do(ctx, 3, func() (string, error) {
		return "", errors.New("should not retry after cancel")
	})

	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context.Canceled, got %v", err)
	}
}
