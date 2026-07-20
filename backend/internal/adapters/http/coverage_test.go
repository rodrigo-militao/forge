package http

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/rodrigo-militao/forge/internal/core/domain"
)

func TestNewContentHandler(t *testing.T) {
	h := NewContentHandler(nil, nil)
	if h == nil {
		t.Error("expected non-nil handler")
	}
}

func TestIdeasHandler_Routes(t *testing.T) {
	h := NewIdeasHandler(nil, nil)
	r := h.Routes()
	if r == nil {
		t.Error("expected non-nil router")
	}
}

func TestWriteNotFoundOrErr(t *testing.T) {
	t.Run("ErrNotFound writes 404 and returns true", func(t *testing.T) {
		w := httptest.NewRecorder()
		result := writeNotFoundOrErr(w, domain.ErrNotFound)
		if !result {
			t.Error("expected true for ErrNotFound")
		}
		if w.Code != http.StatusNotFound {
			t.Errorf("expected 404, got %d", w.Code)
		}
	})

	t.Run("other error writes 500 and returns false", func(t *testing.T) {
		w := httptest.NewRecorder()
		result := writeNotFoundOrErr(w, errors.New("some other error"))
		if result {
			t.Error("expected false for non-ErrNotFound")
		}
		if w.Code != http.StatusInternalServerError {
			t.Errorf("expected 500, got %d", w.Code)
		}
	})
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
