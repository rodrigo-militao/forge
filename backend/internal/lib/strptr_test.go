package lib

import (
	"testing"
)

func TestStrPtr(t *testing.T) {
	t.Run("returns non-nil pointer", func(t *testing.T) {
		p := StrPtr("hello")
		if p == nil {
			t.Fatal("StrPtr should return non-nil")
		}
		if *p != "hello" {
			t.Fatalf("StrPtr value = %q, want %q", *p, "hello")
		}
	})

	t.Run("empty string", func(t *testing.T) {
		p := StrPtr("")
		if p == nil {
			t.Fatal("StrPtr(\"\") should return non-nil")
		}
		if *p != "" {
			t.Fatalf("StrPtr(\"\") value = %q, want %q", *p, "")
		}
	})

	t.Run("special characters", func(t *testing.T) {
		p := StrPtr("a\nb\tc")
		if *p != "a\nb\tc" {
			t.Fatalf("StrPtr(special) value = %q, want %q", *p, "a\nb\tc")
		}
	})

	t.Run("each call returns a unique pointer", func(t *testing.T) {
		a := StrPtr("same")
		b := StrPtr("same")
		if a == b {
			t.Fatal("two calls to StrPtr should return distinct pointers")
		}
	})
}
