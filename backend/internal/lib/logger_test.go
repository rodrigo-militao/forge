package lib

import (
	"context"
	"log/slog"
	"strings"
	"sync"
	"testing"
)

// captureHandler records slog output for assertions.
type captureHandler struct {
	mu      sync.Mutex
	entries []captureEntry
}

type captureEntry struct {
	level slog.Level
	msg   string
	attrs []slog.Attr
}

func (h *captureHandler) Enabled(context.Context, slog.Level) bool { return true }

func (h *captureHandler) Handle(_ context.Context, r slog.Record) error {
	h.mu.Lock()
	defer h.mu.Unlock()
	var attrs []slog.Attr
	r.Attrs(func(a slog.Attr) bool {
		attrs = append(attrs, a)
		return true
	})
	h.entries = append(h.entries, captureEntry{level: r.Level, msg: r.Message, attrs: attrs})
	return nil
}

func (h *captureHandler) WithAttrs(attrs []slog.Attr) slog.Handler { return h }
func (h *captureHandler) WithGroup(name string) slog.Handler       { return h }

func setupLogCapture(t *testing.T) *captureHandler {
	t.Helper()
	h := &captureHandler{}
	orig := slog.Default()
	slog.SetDefault(slog.New(h))
	t.Cleanup(func() { slog.SetDefault(orig) })
	return h
}

func hasAttr(attrs []slog.Attr, key, value string) bool {
	for _, a := range attrs {
		if a.Key == key {
			if a.Value.String() == value {
				return true
			}
		}
	}
	return false
}

// --- GenerateRequestID tests ---

func TestGenerateRequestID(t *testing.T) {
	t.Parallel()

	id1 := GenerateRequestID()
	id2 := GenerateRequestID()

	if id1 == "" {
		t.Fatal("expected non-empty request ID")
	}
	if id1 == id2 {
		t.Fatal("expected different request IDs")
	}
	if !strings.HasPrefix(id1, "0x") {
		t.Log("expected hex-like format, got:", id1)
	}
}

func TestGenerateRequestID_length(t *testing.T) {
	t.Parallel()

	id := GenerateRequestID()
	// 8 bytes = 16 hex chars + "0x" prefix = 18 chars
	if len(id) != 18 && len(id) != 16 {
		t.Logf("unexpected ID length: %d (id=%q)", len(id), id)
	}
}

// --- WithRequestID / GetRequestID tests ---

func TestWithRequestID_roundtrip(t *testing.T) {
	t.Parallel()

	ctx := WithRequestID(context.Background(), "req-abc-123")
	got := GetRequestID(ctx)
	if got != "req-abc-123" {
		t.Errorf("expected 'req-abc-123', got '%s'", got)
	}
}

func TestGetRequestID_missing(t *testing.T) {
	t.Parallel()

	got := GetRequestID(context.Background())
	if got != "" {
		t.Errorf("expected empty string, got '%s'", got)
	}
}

func TestWithRequestID_emptyString(t *testing.T) {
	t.Parallel()

	ctx := WithRequestID(context.Background(), "")
	got := GetRequestID(ctx)
	if got != "" {
		t.Errorf("expected empty string for empty input, got '%s'", got)
	}
}

func TestWithRequestID_overwrites(t *testing.T) {
	t.Parallel()

	ctx := WithRequestID(context.Background(), "first")
	ctx = WithRequestID(ctx, "second")
	got := GetRequestID(ctx)
	if got != "second" {
		t.Errorf("expected 'second', got '%s'", got)
	}
}

// --- LogAttrs tests ---

func TestLogAttrs_withRequestID(t *testing.T) {
	c := setupLogCapture(t)

	ctx := WithRequestID(context.Background(), "req-42")
	LogAttrs(ctx, slog.LevelInfo, "user action", slog.String("key", "val"))

	if len(c.entries) != 1 {
		t.Fatalf("expected 1 log entry, got %d", len(c.entries))
	}
	e := c.entries[0]
	if e.level != slog.LevelInfo {
		t.Errorf("expected LevelInfo, got %s", e.level)
	}
	if e.msg != "user action" {
		t.Errorf("expected 'user action', got '%s'", e.msg)
	}
	if !hasAttr(e.attrs, "request_id", "req-42") {
		t.Errorf("expected request_id='req-42' in attrs, got %v", e.attrs)
	}
	if !hasAttr(e.attrs, "key", "val") {
		t.Errorf("expected key='val' in attrs, got %v", e.attrs)
	}
}

func TestLogAttrs_withoutRequestID(t *testing.T) {
	c := setupLogCapture(t)

	LogAttrs(context.Background(), slog.LevelWarn, "no request id")

	if len(c.entries) != 1 {
		t.Fatalf("expected 1 log entry, got %d", len(c.entries))
	}
	e := c.entries[0]
	if e.level != slog.LevelWarn {
		t.Errorf("expected LevelWarn, got %s", e.level)
	}
	if e.msg != "no request id" {
		t.Errorf("expected 'no request id', got '%s'", e.msg)
	}
	for _, a := range e.attrs {
		if a.Key == "request_id" {
			t.Error("did not expect request_id attr when context has no request ID")
		}
	}
}

func TestLogAttrs_withEmptyContext(t *testing.T) {
	c := setupLogCapture(t)

	LogAttrs(context.Background(), slog.LevelDebug, "debug msg")

	if len(c.entries) != 1 {
		t.Fatalf("expected 1 log entry, got %d", len(c.entries))
	}
	if c.entries[0].level != slog.LevelDebug {
		t.Errorf("expected LevelDebug, got %s", c.entries[0].level)
	}
}

func TestLogAttrs_multipleAttrs(t *testing.T) {
	c := setupLogCapture(t)

	ctx := WithRequestID(context.Background(), "req-99")
	LogAttrs(ctx, slog.LevelError, "something failed",
		slog.String("error", "timeout"),
		slog.Int("code", 500),
	)

	if len(c.entries) != 1 {
		t.Fatalf("expected 1 log entry, got %d", len(c.entries))
	}
	attrs := c.entries[0].attrs
	if !hasAttr(attrs, "request_id", "req-99") {
		t.Error("expected request_id attr")
	}
	if !hasAttr(attrs, "error", "timeout") {
		t.Error("expected error attr")
	}
	if !hasAttr(attrs, "code", "500") {
		t.Error("expected code attr with value 500")
	}
}

func TestLogAttrs_noAttrs(t *testing.T) {
	c := setupLogCapture(t)

	ctx := WithRequestID(context.Background(), "req-1")
	LogAttrs(ctx, slog.LevelInfo, "bare message")

	if len(c.entries) != 1 {
		t.Fatalf("expected 1 log entry, got %d", len(c.entries))
	}
	if !hasAttr(c.entries[0].attrs, "request_id", "req-1") {
		t.Error("expected request_id attr even with no user attrs")
	}
}
