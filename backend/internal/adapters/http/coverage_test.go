package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNewContentHandler(t *testing.T) {
	h := NewContentHandler(nil, nil)
	if h == nil {
		t.Error("expected non-nil handler")
	}
}

func TestIdeasHandler_Routes(t *testing.T) {
	h := NewIdeasHandler(nil)
	r := h.Routes()
	if r == nil {
		t.Error("expected non-nil router")
	}
}

func TestNewEditionHandler(t *testing.T) {
	h := NewEditionHandler(nil)
	if h == nil {
		t.Error("expected non-nil handler")
	}
}

// noFlushResponseWriter wraps http.ResponseWriter but does NOT implement http.Flusher.
type noFlushResponseWriter struct {
	code int
	h    http.Header
}

func (w *noFlushResponseWriter) Header() http.Header {
	if w.h == nil {
		w.h = make(http.Header)
	}
	return w.h
}

func (w *noFlushResponseWriter) Write(b []byte) (int, error) { return len(b), nil }
func (w *noFlushResponseWriter) WriteHeader(code int)         { w.code = code }

func TestResponseWriterFlush(t *testing.T) {
	t.Run("with flusher delegates flush", func(t *testing.T) {
		w := httptest.NewRecorder()
		rw := &responseWriter{ResponseWriter: w}
		// Should not panic or error
		rw.Flush()
	})

	t.Run("without flusher does not panic", func(t *testing.T) {
		inner := &noFlushResponseWriter{}
		rw := &responseWriter{ResponseWriter: inner}
		// Should not panic
		rw.Flush()
	})
}
