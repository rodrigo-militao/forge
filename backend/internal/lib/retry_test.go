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

func TestDo_successOnFirstTry(t *testing.T) {
	t.Parallel()

	result, err := Do(context.Background(), 3, func() (string, error) {
		return "ok", nil
	})

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result != "ok" {
		t.Fatalf("expected 'ok', got %q", result)
	}
}

func TestDo_successOnFirstTry_zeroRetries(t *testing.T) {
	t.Parallel()

	var attempts int
	result, err := Do(context.Background(), 0, func() (string, error) {
		attempts++
		return "ok", nil
	})

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result != "ok" {
		t.Fatalf("expected 'ok', got %q", result)
	}
	if attempts != 1 {
		t.Fatalf("expected 1 attempt, got %d", attempts)
	}
}

func TestDo_failsWithZeroRetries(t *testing.T) {
	t.Parallel()

	_, err := Do(context.Background(), 0, func() (string, error) {
		return "", errors.New("fail")
	})

	if err == nil {
		t.Fatal("expected error with zero retries when fn fails")
	}
}

func TestDo_contextCancellationDuringBackoff(t *testing.T) {
	t.Parallel()

	ctx, cancel := context.WithCancel(context.Background())

	// Cancel from within the function so cancellation happens during backoff.
	_, err := Do(ctx, 5, func() (string, error) {
		cancel()
		return "", errors.New("retry")
	})

	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected context.Canceled, got %v", err)
	}
}

func TestDo_stopRetry(t *testing.T) {
	t.Parallel()

	var attempts int
	_, err := Do(context.Background(), 5, func() (string, error) {
		attempts++
		return "", StopRetry(errors.New("fatal error"))
	})

	if attempts != 1 {
		t.Errorf("expected 1 attempt, got %d", attempts)
	}
	if err == nil || err.Error() != "fatal error" {
		t.Errorf("expected 'fatal error', got %v", err)
	}
}

func TestDo_stopRetryUnwrap(t *testing.T) {
	t.Parallel()

	sentinel := errors.New("sentinel")
	wrapped := StopRetry(sentinel)

	if !errors.Is(wrapped, sentinel) {
		t.Error("StopRetry should wrap the original error")
	}
}

func TestStopRetry_Error(t *testing.T) {
	t.Parallel()

	err := StopRetry(errors.New("fatal: something broke"))
	got := err.Error()
	if got != "fatal: something broke" {
		t.Errorf("expected 'fatal: something broke', got %q", got)
	}
}

func TestDo_negativeRetries(t *testing.T) {
	t.Parallel()

	// maxRetries < 0 means the loop never executes.
	_, err := Do(context.Background(), -1, func() (string, error) {
		t.Error("function should not be called with negative retries")
		return "ok", nil
	})

	if err == nil {
		t.Fatal("expected error when no attempt is made")
	}
}

func TestDo_failsOnAllRetries(t *testing.T) {
	t.Parallel()

	_, err := Do(context.Background(), 3, func() (string, error) {
		return "", errors.New("always fails")
	})

	if err == nil {
		t.Fatal("expected error")
	}
}

func TestDo_typeInference(t *testing.T) {
	t.Parallel()

	// Verify generic type inference works with int.
	result, err := Do(context.Background(), 1, func() (int, error) {
		return 42, nil
	})

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result != 42 {
		t.Fatalf("expected 42, got %d", result)
	}
}
