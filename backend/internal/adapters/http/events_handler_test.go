package http

import (
	"context"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/adapters/events"
)

func TestNewEventsHandler(t *testing.T) {
	t.Parallel()

	t.Run("unauthorized when no user ID in context", func(t *testing.T) {
		hub := events.NewHub()
		handler := NewEventsHandler(hub)
		w := httptest.NewRecorder()
		r := httptest.NewRequest("GET", "/api/events", nil)

		handler(w, r)

		if w.Result().StatusCode != 401 {
			t.Errorf("expected 401, got %d", w.Result().StatusCode)
		}
	})

	t.Run("SSE connection streams events until context cancellation", func(t *testing.T) {
		hub := events.NewHub()
		uid := uuid.New()

		ctx, cancel := context.WithCancel(context.WithValue(context.Background(), userIDKey, uid))
		defer cancel()

		r := httptest.NewRequest("GET", "/api/events", nil).WithContext(ctx)
		w := httptest.NewRecorder()

		done := make(chan struct{})
		go func() {
			defer close(done)
			NewEventsHandler(hub)(w, r)
		}()

		// Give handler time to register and write the initial comment
		time.Sleep(50 * time.Millisecond)

		// Send an event via hub
		hub.NotifyUser(uid, "content_changed", `{"id":"abc"}`)

		// Give the handler time to receive and write the event
		time.Sleep(100 * time.Millisecond)

		// Cancel context to stop the SSE loop
		cancel()
		<-done

		body := w.Body.String()
		if !strings.Contains(body, ": connected") {
			t.Error("expected ': connected' comment in SSE response body")
		}
		if !strings.Contains(body, "event: content_changed") {
			t.Error("expected 'event: content_changed' in SSE response body")
		}
		if !strings.Contains(body, `data: {"id":"abc"}`) {
			t.Error("expected event data in SSE response body")
		}
	})
}
