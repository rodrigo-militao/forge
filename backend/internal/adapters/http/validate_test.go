package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
)

func TestValidateRequired(t *testing.T) {
	t.Run("empty value returns false and writes 400", func(t *testing.T) {
		w := httptest.NewRecorder()
		ok := validateRequired(w, "", "title")
		if ok {
			t.Fatal("expected false for empty value")
		}
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", w.Code)
		}
		var resp apiError
		if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if resp.Error != "title is required" {
			t.Fatalf("expected error %q, got %q", "title is required", resp.Error)
		}
	})

	t.Run("non-empty value returns true", func(t *testing.T) {
		w := httptest.NewRecorder()
		ok := validateRequired(w, "hello", "title")
		if !ok {
			t.Fatal("expected true for non-empty value")
		}
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 (default), got %d", w.Code)
		}
	})
}

func TestValidateMinLen(t *testing.T) {
	t.Run("too short returns false and writes 400", func(t *testing.T) {
		w := httptest.NewRecorder()
		ok := validateMinLen(w, "ab", 3, "username")
		if ok {
			t.Fatal("expected false for short value")
		}
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", w.Code)
		}
		var resp apiError
		if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if resp.Error != "username must be at least 3 characters" {
			t.Fatalf("expected error %q, got %q", "username must be at least 3 characters", resp.Error)
		}
	})

	t.Run("exact minimum returns true", func(t *testing.T) {
		w := httptest.NewRecorder()
		ok := validateMinLen(w, "abc", 3, "username")
		if !ok {
			t.Fatal("expected true for exact minimum length")
		}
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 (default), got %d", w.Code)
		}
	})

	t.Run("longer than minimum returns true", func(t *testing.T) {
		w := httptest.NewRecorder()
		ok := validateMinLen(w, "abcd", 3, "username")
		if !ok {
			t.Fatal("expected true for longer value")
		}
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 (default), got %d", w.Code)
		}
	})

	t.Run("empty string with minimum > 0 returns false", func(t *testing.T) {
		w := httptest.NewRecorder()
		ok := validateMinLen(w, "", 1, "field")
		if ok {
			t.Fatal("expected false for empty string")
		}
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", w.Code)
		}
	})
}

func TestValidateUUID(t *testing.T) {
	t.Run("invalid UUID returns zero UUID and false", func(t *testing.T) {
		w := httptest.NewRecorder()
		id, ok := validateUUID(w, "not-a-uuid", "content_id")
		if ok {
			t.Fatal("expected false for invalid UUID")
		}
		if id != uuid.Nil {
			t.Fatalf("expected uuid.Nil, got %v", id)
		}
		if w.Code != http.StatusBadRequest {
			t.Fatalf("expected 400, got %d", w.Code)
		}
		var resp apiError
		if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
			t.Fatalf("failed to decode response: %v", err)
		}
		if resp.Error != "invalid content_id" {
			t.Fatalf("expected error %q, got %q", "invalid content_id", resp.Error)
		}
	})

	t.Run("empty string returns false", func(t *testing.T) {
		w := httptest.NewRecorder()
		id, ok := validateUUID(w, "", "id")
		if ok {
			t.Fatal("expected false for empty string")
		}
		if id != uuid.Nil {
			t.Fatalf("expected uuid.Nil, got %v", id)
		}
	})

	t.Run("valid UUID returns parsed UUID and true", func(t *testing.T) {
		w := httptest.NewRecorder()
		expected := uuid.New()
		id, ok := validateUUID(w, expected.String(), "content_id")
		if !ok {
			t.Fatal("expected true for valid UUID")
		}
		if id != expected {
			t.Fatalf("expected %v, got %v", expected, id)
		}
		if w.Code != http.StatusOK {
			t.Fatalf("expected 200 (default), got %d", w.Code)
		}
	})
}
