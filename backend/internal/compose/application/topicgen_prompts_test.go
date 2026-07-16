package application

import (
	"strings"
	"testing"
	"time"

	"github.com/rodrigo-militao/forge/internal/compose/domain"
)

func TestBuildTopicSystemPrompt_emptyHistory(t *testing.T) {
	prompt := BuildTopicSystemPrompt(nil)

	if prompt == "" {
		t.Fatal("expected non-empty prompt")
	}
	if !strings.Contains(prompt, "(none yet)") {
		t.Error("expected avoid list to show '(none yet)' when history is empty")
	}
	if !strings.Contains(prompt, "AVOID LIST") {
		t.Error("expected prompt to contain 'AVOID LIST' section")
	}
	if !strings.Contains(prompt, "Output strictly as JSON") {
		t.Error("expected prompt to mention JSON output format")
	}
}

func TestBuildTopicSystemPrompt_withHistory(t *testing.T) {
	now := time.Now()
	history := []domain.HistoryEntry{
		{
			Topic: domain.Topic{
				Topic:     "Go Generics",
				ThemeArea: domain.ThemeBackendInfra,
				Format:    domain.FormatDeepDive,
			},
			GeneratedAt: now,
		},
		{
			Topic: domain.Topic{
				Topic:     "Prompt Engineering Tips",
				ThemeArea: domain.ThemeAI,
				Format:    domain.FormatFramework,
			},
			GeneratedAt: now,
		},
	}

	prompt := BuildTopicSystemPrompt(history)

	if prompt == "" {
		t.Fatal("expected non-empty prompt")
	}
	if !strings.Contains(prompt, "Go Generics") {
		t.Error("expected prompt to contain first history topic")
	}
	if !strings.Contains(prompt, "Prompt Engineering Tips") {
		t.Error("expected prompt to contain second history topic")
	}
	if !strings.Contains(prompt, string(domain.ThemeBackendInfra)) {
		t.Error("expected prompt to contain theme area from history")
	}
	if !strings.Contains(prompt, string(domain.FormatDeepDive)) {
		t.Error("expected prompt to contain format from history")
	}
	if strings.Contains(prompt, "(none yet)") {
		t.Error("expected avoid list NOT to show '(none yet)' when history exists")
	}
}

func TestBuildTopicSystemPrompt_singleHistoryEntry(t *testing.T) {
	history := []domain.HistoryEntry{
		{
			Topic: domain.Topic{
				Topic:     "Single Topic",
				ThemeArea: domain.ThemeContentCreation,
				Format:    domain.FormatEssay,
			},
			GeneratedAt: time.Now(),
		},
	}

	prompt := BuildTopicSystemPrompt(history)

	if !strings.Contains(prompt, "Single Topic") {
		t.Error("expected prompt to contain the topic from single history entry")
	}
	if !strings.Contains(prompt, string(domain.ThemeContentCreation)) {
		t.Error("expected prompt to contain theme area")
	}
}

func TestBuildTopicSystemPrompt_containsAllThemeAreas(t *testing.T) {
	prompt := BuildTopicSystemPrompt(nil)

	expectedAreas := []string{"backend/infrastructure", "Go, databases", "distributed systems", "AI", "Personal development", "Content creation"}
	for _, area := range expectedAreas {
		if !strings.Contains(prompt, area) {
			t.Errorf("expected prompt to mention '%s'", area)
		}
	}
}

func TestBuildTopicSystemPrompt_containsJSONSchema(t *testing.T) {
	prompt := BuildTopicSystemPrompt(nil)

	expectedFields := []string{`"topic"`, `"theme_area"`, `"format"`, `"one_line_pitch"`, `"target_length_words"`}
	for _, field := range expectedFields {
		if !strings.Contains(prompt, field) {
			t.Errorf("expected prompt to contain JSON field '%s'", field)
		}
	}
}
