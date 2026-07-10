package lib

import (
	"context"
	"crypto/rand"
	"fmt"
	"log/slog"
)

type contextKey string

const requestIDKey contextKey = "request_id"

// GenerateRequestID creates a short unique trace identifier.
func GenerateRequestID() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("%x", b)
	}
	return fmt.Sprintf("%x", b)
}

// WithRequestID stores a request ID in the context.
func WithRequestID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, requestIDKey, id)
}

// GetRequestID retrieves the request ID from context, if any.
func GetRequestID(ctx context.Context) string {
	if id, ok := ctx.Value(requestIDKey).(string); ok {
		return id
	}
	return ""
}

// LogAttrs returns slog.Attrs enriched with request_id from context, if present.
// Usage: logger.LogAttrs(ctx, slog.LevelInfo, "msg", slog.String("key", "val"))
func LogAttrs(ctx context.Context, level slog.Level, msg string, attrs ...slog.Attr) {
	if id := GetRequestID(ctx); id != "" {
		attrs = append(attrs, slog.String("request_id", id))
	}
	slog.LogAttrs(ctx, level, msg, attrs...)
}
