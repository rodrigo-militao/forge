package application

import (
	"testing"
)

func TestParseTopicJSON(t *testing.T) {
	t.Run("valid JSON", func(t *testing.T) {
		raw := `{"topic": "Why B-Trees still beat LSM-Trees", "theme_area": "backend_infra", "format": "deep_dive", "one_line_pitch": "Read-heavy workloads favor B-Trees", "target_length_words": 1800}`
		topic, err := ParseTopicJSON(raw)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if topic.Topic != "Why B-Trees still beat LSM-Trees" {
			t.Errorf("expected topic 'Why B-Trees still beat LSM-Trees', got '%s'", topic.Topic)
		}
		if string(topic.ThemeArea) != "backend_infra" {
			t.Errorf("expected theme_area 'backend_infra', got '%s'", topic.ThemeArea)
		}
		if string(topic.Format) != "deep_dive" {
			t.Errorf("expected format 'deep_dive', got '%s'", topic.Format)
		}
		if topic.OneLinePitch != "Read-heavy workloads favor B-Trees" {
			t.Errorf("expected one_line_pitch 'Read-heavy workloads favor B-Trees', got '%s'", topic.OneLinePitch)
		}
		if topic.TargetLengthWords != 1800 {
			t.Errorf("expected target_length_words 1800, got %d", topic.TargetLengthWords)
		}
	})

	t.Run("JSON wrapped in markdown code fences", func(t *testing.T) {
		raw := "```json\n{\"topic\": \"Go Concurrency Patterns\", \"theme_area\": \"backend_infra\", \"format\": \"tutorial\", \"one_line_pitch\": \"Master goroutines and channels\", \"target_length_words\": 1500}\n```"
		topic, err := ParseTopicJSON(raw)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if topic.Topic != "Go Concurrency Patterns" {
			t.Errorf("expected 'Go Concurrency Patterns', got '%s'", topic.Topic)
		}
	})

	t.Run("JSON embedded in conversational text", func(t *testing.T) {
		raw := "Here is a great topic:\n{\"topic\": \"Rust vs Go\", \"theme_area\": \"backend_infra\", \"format\": \"framework\", \"one_line_pitch\": \"Comparing two systems languages\", \"target_length_words\": 2000}\nLet me know if you need more."
		topic, err := ParseTopicJSON(raw)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if topic.Topic != "Rust vs Go" {
			t.Errorf("expected 'Rust vs Go', got '%s'", topic.Topic)
		}
	})

	t.Run("zero target_length_words defaults to 1500", func(t *testing.T) {
		raw := `{"topic": "Zero Length Test", "theme_area": "backend_infra", "format": "tutorial", "one_line_pitch": "Testing defaults", "target_length_words": 0}`
		topic, err := ParseTopicJSON(raw)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if topic.TargetLengthWords != 1500 {
			t.Errorf("expected default 1500, got %d", topic.TargetLengthWords)
		}
	})

	t.Run("negative target_length_words defaults to 1500", func(t *testing.T) {
		raw := `{"topic": "Negative Test", "theme_area": "ai", "format": "deep_dive", "one_line_pitch": "Testing negative defaults", "target_length_words": -100}`
		topic, err := ParseTopicJSON(raw)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if topic.TargetLengthWords != 1500 {
			t.Errorf("expected default 1500, got %d", topic.TargetLengthWords)
		}
	})

	t.Run("empty string returns error", func(t *testing.T) {
		_, err := ParseTopicJSON("")
		if err == nil {
			t.Fatal("expected error for empty string")
		}
	})

	t.Run("invalid JSON returns error", func(t *testing.T) {
		_, err := ParseTopicJSON("not json at all")
		if err == nil {
			t.Fatal("expected error for invalid JSON")
		}
	})

	t.Run("JSON with missing topic field returns error", func(t *testing.T) {
		raw := `{"theme_area": "backend_infra", "format": "tutorial", "one_line_pitch": "Missing topic", "target_length_words": 1500}`
		_, err := ParseTopicJSON(raw)
		if err == nil {
			t.Fatal("expected error when topic field is missing")
		}
	})

	t.Run("JSON with empty topic string returns error", func(t *testing.T) {
		raw := `{"topic": "", "theme_area": "backend_infra", "format": "tutorial", "one_line_pitch": "Empty topic", "target_length_words": 1500}`
		_, err := ParseTopicJSON(raw)
		if err == nil {
			t.Fatal("expected error when topic is empty")
		}
	})

	t.Run("JSON with extra fields is accepted", func(t *testing.T) {
		raw := `{"topic": "Extra Fields", "theme_area": "personal_dev", "format": "essay", "one_line_pitch": "Extra fields ignored", "target_length_words": 1200, "extra_field": "should be ignored"}`
		topic, err := ParseTopicJSON(raw)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if topic.Topic != "Extra Fields" {
			t.Errorf("expected 'Extra Fields', got '%s'", topic.Topic)
		}
	})

	t.Run("JSON with only braces and no content returns error", func(t *testing.T) {
		_, err := ParseTopicJSON("{}")
		if err == nil {
			t.Fatal("expected error for empty JSON object")
		}
	})

	t.Run("only closing brace missing", func(t *testing.T) {
		raw := `{"topic": "Broken JSON", "theme_area": "backend_infra", "format": "tutorial", "one_line_pitch": "Missing closing brace", "target_length_words": 1500`
		_, err := ParseTopicJSON(raw)
		if err == nil {
			t.Fatal("expected error for incomplete JSON")
		}
	})
}
