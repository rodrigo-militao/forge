package application

import (
	"strings"
	"testing"
)

func TestBuildOutlineSystemPrompt(t *testing.T) {
	prompt := BuildOutlineSystemPrompt()

	if prompt == "" {
		t.Fatal("expected non-empty prompt")
	}

	expectedSections := []string{
		"article outline generator",
		"structured outline",
		"compelling title",
		"3-6 main sections",
		"Output strictly as JSON",
		`"title"`,
		`"sections"`,
		`"heading"`,
		`"points"`,
	}
	for _, s := range expectedSections {
		if !strings.Contains(prompt, s) {
			t.Errorf("expected prompt to contain '%s'", s)
		}
	}
}
