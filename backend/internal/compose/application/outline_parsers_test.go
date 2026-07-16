package application

import (
	"strings"
	"testing"
)

func TestParseOutlineResponse(t *testing.T) {
	t.Run("valid JSON", func(t *testing.T) {
		raw := `{"title": "Go Concurrency Patterns", "sections": [{"heading": "Introduction", "points": ["Why concurrency matters", "Go's approach"]}, {"heading": "Goroutines", "points": ["Lightweight threads", "Scheduling"]}]}`
		result, err := ParseOutlineResponse(raw)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !strings.Contains(result, "Go Concurrency Patterns") {
			t.Error("expected outline to contain title")
		}
		if !strings.Contains(result, "Introduction") {
			t.Error("expected outline to contain first section heading")
		}
		if !strings.Contains(result, "Goroutines") {
			t.Error("expected outline to contain second section heading")
		}
		if !strings.Contains(result, "Why concurrency matters") {
			t.Error("expected outline to contain point from first section")
		}
		if !strings.Contains(result, "Lightweight threads") {
			t.Error("expected outline to contain point from second section")
		}
	})

	t.Run("JSON wrapped in markdown code fences", func(t *testing.T) {
		raw := "```\n{\"title\": \"Rust Memory Model\", \"sections\": [{\"heading\": \"Ownership\", \"points\": [\"Borrow checker\", \"Lifetimes\"]}]}\n```"
		result, err := ParseOutlineResponse(raw)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !strings.Contains(result, "Rust Memory Model") {
			t.Errorf("expected outline to contain title, got '%s'", result)
		}
	})

	t.Run("JSON embedded in text", func(t *testing.T) {
		raw := "Here is the outline:\n{\"title\": \"Test Driven Development\", \"sections\": [{\"heading\": \"Red-Green-Refactor\", \"points\": [\"Write failing test\", \"Make it pass\", \"Refactor\"]}]}\nHope this helps!"
		result, err := ParseOutlineResponse(raw)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !strings.Contains(result, "Test Driven Development") {
			t.Errorf("expected outline to contain title, got '%s'", result)
		}
		if !strings.Contains(result, "Red-Green-Refactor") {
			t.Error("expected outline to contain section heading")
		}
	})

	t.Run("empty string returns error", func(t *testing.T) {
		_, err := ParseOutlineResponse("")
		if err == nil {
			t.Fatal("expected error for empty string")
		}
	})

	t.Run("invalid JSON returns error", func(t *testing.T) {
		_, err := ParseOutlineResponse("this is not json")
		if err == nil {
			t.Fatal("expected error for invalid JSON")
		}
	})

	t.Run("missing title returns error", func(t *testing.T) {
		raw := `{"sections": [{"heading": "Intro", "points": ["Point one"]}]}`
		_, err := ParseOutlineResponse(raw)
		if err == nil {
			t.Fatal("expected error when title field is missing")
		}
	})

	t.Run("empty sections array returns error", func(t *testing.T) {
		raw := `{"title": "No Sections", "sections": []}`
		_, err := ParseOutlineResponse(raw)
		if err == nil {
			t.Fatal("expected error when sections array is empty")
		}
	})

	t.Run("sections with empty points array still produces output", func(t *testing.T) {
		raw := `{"title": "Empty Points", "sections": [{"heading": "Intro", "points": []}]}`
		result, err := ParseOutlineResponse(raw)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !strings.Contains(result, "Empty Points") {
			t.Error("expected outline to contain title")
		}
		if !strings.Contains(result, "Intro") {
			t.Error("expected outline to contain section heading")
		}
	})

	t.Run("single section outline formats correctly", func(t *testing.T) {
		raw := `{"title": "Single Section", "sections": [{"heading": "Only Section", "points": ["Point A", "Point B"]}]}`
		result, err := ParseOutlineResponse(raw)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !strings.HasPrefix(result, "# Single Section") {
			t.Errorf("expected outline to start with '# Single Section', got '%s'", result[:20])
		}
		if !strings.Contains(result, "## Only Section") {
			t.Error("expected outline to contain section heading with ## prefix")
		}
		if !strings.Contains(result, "- Point A") {
			t.Error("expected outline to contain bullet point")
		}
		if !strings.Contains(result, "- Point B") {
			t.Error("expected outline to contain second bullet point")
		}
	})

	t.Run("only opening brace with no content returns error", func(t *testing.T) {
		_, err := ParseOutlineResponse("{")
		if err == nil {
			t.Fatal("expected error for just an opening brace")
		}
	})

	t.Run("JSON without sections key returns error", func(t *testing.T) {
		raw := `{"title": "No Sections Key"}`
		_, err := ParseOutlineResponse(raw)
		if err == nil {
			t.Fatal("expected error when sections key is missing")
		}
	})
}
