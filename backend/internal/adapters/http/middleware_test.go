package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/lib"
)

func TestAuthRequired(t *testing.T) {
	InitJWT("test-secret")
	userID := uuid.New()

	t.Run("no cookie returns 401", func(t *testing.T) {
		w := httptest.NewRecorder()
		handler := AuthRequired(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("next handler should not be called when cookie is missing")
		}))
		req := httptest.NewRequest("GET", "/protected", nil)
		handler.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", w.Code)
		}
		var resp apiError
		if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if resp.Error != "missing session cookie" {
			t.Fatalf("expected error %q, got %q", "missing session cookie", resp.Error)
		}
	})

	t.Run("invalid cookie returns 401", func(t *testing.T) {
		w := httptest.NewRecorder()
		handler := AuthRequired(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("next handler should not be called with invalid token")
		}))
		req := httptest.NewRequest("GET", "/protected", nil)
		req.AddCookie(&http.Cookie{Name: "session", Value: "invalid-jwt-token"})
		handler.ServeHTTP(w, req)

		if w.Code != http.StatusUnauthorized {
			t.Fatalf("expected 401, got %d", w.Code)
		}
		var resp apiError
		if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if resp.Error != "invalid or expired session" {
			t.Fatalf("expected error %q, got %q", "invalid or expired session", resp.Error)
		}
	})

	t.Run("valid cookie calls next handler with userID in context", func(t *testing.T) {
		tokenStr, err := signToken(userID)
		if err != nil {
			t.Fatal(err)
		}

		w := httptest.NewRecorder()
		var gotUserID uuid.UUID
		handler := AuthRequired(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			id, ok := UserIDFromContext(r.Context())
			if !ok {
				t.Fatal("expected userID in context")
			}
			gotUserID = id
			w.WriteHeader(http.StatusOK)
		}))
		req := httptest.NewRequest("GET", "/protected", nil)
		req.AddCookie(&http.Cookie{Name: "session", Value: tokenStr})
		handler.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", w.Code)
		}
		if gotUserID != userID {
			t.Fatalf("expected userID %v, got %v", userID, gotUserID)
		}
	})
}

func TestRequestLogger(t *testing.T) {
	t.Run("propagates X-Request-ID header to context", func(t *testing.T) {
		w := httptest.NewRecorder()
		handler := RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			reqID := lib.GetRequestID(r.Context())
			if reqID != "my-custom-request-id" {
				t.Fatalf("expected request ID %q, got %q", "my-custom-request-id", reqID)
			}
			w.WriteHeader(http.StatusOK)
		}))
		req := httptest.NewRequest("GET", "/test", nil)
		req.Header.Set("X-Request-ID", "my-custom-request-id")
		handler.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", w.Code)
		}
	})

	t.Run("generates request ID when header is missing", func(t *testing.T) {
		w := httptest.NewRecorder()
		handler := RequestLogger(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			reqID := lib.GetRequestID(r.Context())
			if reqID == "" {
				t.Fatal("expected non-empty generated request ID")
			}
			w.WriteHeader(http.StatusOK)
		}))
		req := httptest.NewRequest("GET", "/test", nil)
		handler.ServeHTTP(w, req)

		if w.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d", w.Code)
		}
	})
}
