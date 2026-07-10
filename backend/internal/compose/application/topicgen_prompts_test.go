package application

import (
	"strings"
	"testing"

	"github.com/rodrigo-militao/forge/internal/compose/domain"
)

func TestBuildTopicSystemPrompt(t *testing.T) {
	t.Run("with history", func(t *testing.T) {
		history := []domain.HistoryEntry{
			{Topic: domain.Topic{Topic: "Go Generics", ThemeArea: domain.ThemeBackendInfra, Format: domain.FormatTutorial}},
			{Topic: domain.Topic{Topic: "Rust vs Go", ThemeArea: domain.ThemeBackendInfra, Format: domain.FormatDeepDive}},
		}

		prompt := BuildTopicSystemPrompt(history)

		if prompt == "" {
			t.Fatal("expected non-empty prompt")
		}
		if !strings.Contains(prompt, "Go Generics") {
			t.Error("expected first history item in prompt")
		}
		if !strings.Contains(prompt, "Rust vs Go") {
			t.Error("expected second history item in prompt")
		}
		if !strings.Contains(prompt, "AVOID LIST") {
			t.Error("expected avoid list heading")
		}
	})

	t.Run("empty history", func(t *testing.T) {
		prompt := BuildTopicSystemPrompt(nil)

		if prompt == "" {
			t.Fatal("expected non-empty prompt")
		}
		if !strings.Contains(prompt, "(none yet)") {
			t.Error("expected '(none yet)' for empty history")
		}
	})
}
