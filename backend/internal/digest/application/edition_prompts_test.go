package application

import (
	"testing"
)

func TestBuildEditionPrompt(t *testing.T) {
	items := []string{
		"- Go Generics\n  A deep dive into type parameters",
		"- Rust vs Go\n  A comparison of the two languages",
	}

	prompt := BuildEditionPrompt(items)

	if prompt == "" {
		t.Fatal("expected non-empty prompt")
	}
	if !contains(prompt, "Go Generics") {
		t.Error("expected first item in prompt")
	}
	if !contains(prompt, "Rust vs Go") {
		t.Error("expected second item in prompt")
	}
}

func TestBuildEditionPrompt_empty(t *testing.T) {
	prompt := BuildEditionPrompt(nil)
	if prompt == "" {
		t.Error("expected non-empty prompt even with no items")
	}
}
