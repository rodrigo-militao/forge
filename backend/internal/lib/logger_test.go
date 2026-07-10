package lib

import (
	"strings"
	"testing"
)

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
