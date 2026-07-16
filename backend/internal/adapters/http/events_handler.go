package http

import (
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// NewEventsHandler returns an SSE endpoint that streams content_changed events
// for the authenticated user (ADR 0031).
func NewEventsHandler(hub ports.EventBus) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, ok := UserIDFromContext(r.Context())
		if !ok {
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}

		rc := http.NewResponseController(w)

		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
		w.WriteHeader(http.StatusOK)

		// Initial keepalive comment (SSE spec: comments starting with : are ignored)
		fmt.Fprintf(w, ": connected\n\n")
		if err := rc.Flush(); err != nil {
			slog.Warn("sse: initial flush failed", "error", err)
		}

		ch := hub.Register(userID)
		defer hub.Unregister(userID, ch)

		for {
			select {
			case <-r.Context().Done():
				return
			case evt, ok := <-ch:
				if !ok {
					return
				}
				if evt.Type != "" {
					fmt.Fprintf(w, "event: %s\n", evt.Type)
				}
				for _, line := range strings.Split(evt.Data, "\n") {
					fmt.Fprintf(w, "data: %s\n", line)
				}
				fmt.Fprintf(w, "\n")
				if err := rc.Flush(); err != nil {
					slog.Warn("sse: flush failed", "error", err)
				}
			}
		}
	}
}
