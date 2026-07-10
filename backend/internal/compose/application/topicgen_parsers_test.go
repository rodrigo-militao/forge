package application

import (
	"testing"
)

func TestParseTopicJSON(t *testing.T) {
	t.Run("parses valid JSON", func(t *testing.T) {
		raw := `{"topic":"Go Generics in Practice","theme_area":"backend_infra","format":"tutorial","one_line_pitch":"A practical guide","target_length_words":1500}`
		topic, err := ParseTopicJSON(raw)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if topic.Topic != "Go Generics in Practice" {
			t.Errorf("expected 'Go Generics in Practice', got '%s'", topic.Topic)
		}
		if string(topic.ThemeArea) != "backend_infra" {
			t.Errorf("expected 'backend_infra', got '%s'", topic.ThemeArea)
		}
		if string(topic.Format) != "tutorial" {
			t.Errorf("expected 'tutorial', got '%s'", topic.Format)
		}
		if topic.OneLinePitch != "A practical guide" {
			t.Errorf("expected 'A practical guide', got '%s'", topic.OneLinePitch)
		}
		if topic.TargetLengthWords != 1500 {
			t.Errorf("expected 1500, got %d", topic.TargetLengthWords)
		}
	})

	t.Run("extracts JSON from code blocks", func(t *testing.T) {
		raw := "```json\n{\"topic\":\"From Code Block\",\"theme_area\":\"ai\",\"format\":\"deep_dive\",\"one_line_pitch\":\"Found in block\",\"target_length_words\":2000}\n```"
		topic, err := ParseTopicJSON(raw)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if topic.Topic != "From Code Block" {
			t.Errorf("expected 'From Code Block', got '%s'", topic.Topic)
		}
	})

	t.Run("defaults zero target words", func(t *testing.T) {
		raw := `{"topic":"Test","theme_area":"backend_infra","format":"tutorial","one_line_pitch":"Testing","target_length_words":0}`
		topic, err := ParseTopicJSON(raw)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if topic.TargetLengthWords != 1500 {
			t.Errorf("expected default 1500, got %d", topic.TargetLengthWords)
		}
	})

	t.Run("empty input", func(t *testing.T) {
		_, err := ParseTopicJSON("")
		if err == nil {
			t.Error("expected error for empty input")
		}
	})

	t.Run("missing topic field", func(t *testing.T) {
		raw := `{"theme_area":"backend_infra","format":"tutorial"}`
		_, err := ParseTopicJSON(raw)
		if err == nil {
			t.Error("expected error when topic field is missing")
		}
	})
}
