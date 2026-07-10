package application

import (
	"strings"
	"testing"

	"github.com/rodrigo-militao/forge/internal/compose/domain"
)

func TestBuildWriterSystemPrompt(t *testing.T) {
	topic := domain.Topic{
		Topic:        "Go Generics in Practice",
		ThemeArea:    domain.ThemeBackendInfra,
		Format:       domain.FormatTutorial,
		OneLinePitch: "How to use generics effectively",
	}

	prompt := BuildWriterSystemPrompt(topic, "VOICE: Clean Technical", 1500)

	if prompt == "" {
		t.Fatal("expected non-empty prompt")
	}
	if !strings.Contains(prompt, "Go Generics in Practice") {
		t.Error("expected topic in prompt")
	}
	if !strings.Contains(prompt, "backend_infra") {
		t.Error("expected theme area in prompt")
	}
	if !strings.Contains(prompt, "tutorial") {
		t.Error("expected format in prompt")
	}
	if !strings.Contains(prompt, "VOICE: Clean Technical") {
		t.Error("expected voice instruction in prompt")
	}
	if !strings.Contains(prompt, "1500") {
		t.Error("expected target word count in prompt")
	}
}

func TestBuildWriterSystemPrompt_zeroWords(t *testing.T) {
	topic := domain.Topic{
		Topic:             "Test Topic",
		ThemeArea:         domain.ThemeAI,
		Format:            domain.FormatDeepDive,
		TargetLengthWords: 0,
	}

	prompt := BuildWriterSystemPrompt(topic, "VOICE: Test", 0)
	if !strings.Contains(prompt, "Test Topic") {
		t.Error("expected topic in prompt")
	}
}
