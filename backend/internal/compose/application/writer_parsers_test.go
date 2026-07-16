package application

import (
	"testing"
)

func TestParseArticleJSON(t *testing.T) {
	t.Run("valid JSON", func(t *testing.T) {
		raw := `{"title": "Go Generics in Practice", "subtitle": "A practical guide", "body_markdown": "# Go Generics\n\nThis is the article body."}`
		article, err := ParseArticleJSON(raw)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if article.Title != "Go Generics in Practice" {
			t.Errorf("expected title 'Go Generics in Practice', got '%s'", article.Title)
		}
		if article.Subtitle != "A practical guide" {
			t.Errorf("expected subtitle 'A practical guide', got '%s'", article.Subtitle)
		}
		if article.BodyMarkdown != "# Go Generics\n\nThis is the article body." {
			t.Errorf("expected body_markdown to match, got '%s'", article.BodyMarkdown)
		}
	})

	t.Run("JSON wrapped in markdown code fences", func(t *testing.T) {
		raw := "```json\n{\"title\": \"Rust vs Go\", \"subtitle\": \"A comparison\", \"body_markdown\": \"Comparison body\"}\n```"
		article, err := ParseArticleJSON(raw)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if article.Title != "Rust vs Go" {
			t.Errorf("expected 'Rust vs Go', got '%s'", article.Title)
		}
	})

	t.Run("JSON embedded in text", func(t *testing.T) {
		raw := "Here is the article:\n{\"title\": \"Test Article\", \"subtitle\": \"A test\", \"body_markdown\": \"Body content here\"}\nLet me know if you need changes."
		article, err := ParseArticleJSON(raw)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if article.Title != "Test Article" {
			t.Errorf("expected 'Test Article', got '%s'", article.Title)
		}
	})

	t.Run("empty string returns error", func(t *testing.T) {
		_, err := ParseArticleJSON("")
		if err == nil {
			t.Fatal("expected error for empty string")
		}
	})

	t.Run("invalid JSON returns error", func(t *testing.T) {
		_, err := ParseArticleJSON("this is not json")
		if err == nil {
			t.Fatal("expected error for invalid JSON")
		}
	})

	t.Run("missing title returns error", func(t *testing.T) {
		raw := `{"subtitle": "A test", "body_markdown": "Body content"}`
		_, err := ParseArticleJSON(raw)
		if err == nil {
			t.Fatal("expected error when title field is missing")
		}
	})

	t.Run("empty title returns error", func(t *testing.T) {
		raw := `{"title": "", "subtitle": "A test", "body_markdown": "Body content"}`
		_, err := ParseArticleJSON(raw)
		if err == nil {
			t.Fatal("expected error when title is empty")
		}
	})

	t.Run("missing body_markdown returns error", func(t *testing.T) {
		raw := `{"title": "No Body", "subtitle": "Missing body"}`
		_, err := ParseArticleJSON(raw)
		if err == nil {
			t.Fatal("expected error when body_markdown field is missing")
		}
	})

	t.Run("empty body_markdown returns error", func(t *testing.T) {
		raw := `{"title": "Empty Body", "subtitle": "A test", "body_markdown": ""}`
		_, err := ParseArticleJSON(raw)
		if err == nil {
			t.Fatal("expected error when body_markdown is empty")
		}
	})

	t.Run("missing subtitle is acceptable", func(t *testing.T) {
		raw := `{"title": "No Subtitle", "body_markdown": "Body content without subtitle"}`
		article, err := ParseArticleJSON(raw)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if article.Title != "No Subtitle" {
			t.Errorf("expected 'No Subtitle', got '%s'", article.Title)
		}
		if article.Subtitle != "" {
			t.Errorf("expected empty subtitle, got '%s'", article.Subtitle)
		}
	})

	t.Run("JSON with extra fields is accepted", func(t *testing.T) {
		raw := `{"title": "Extra Fields", "subtitle": "Ignored extra", "body_markdown": "Body", "extra_field": "should be ignored"}`
		article, err := ParseArticleJSON(raw)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if article.Title != "Extra Fields" {
			t.Errorf("expected 'Extra Fields', got '%s'", article.Title)
		}
	})

	t.Run("body with markdown formatting preserved", func(t *testing.T) {
		expected := "# Heading\n\nParagraph with **bold** and *italic*.\n\n- List item 1\n- List item 2"
		// Use raw string literal so \n is literal backslash-n, valid JSON escaping.
		raw := `{"title": "Markdown Body", "subtitle": "A test", "body_markdown": "# Heading\n\nParagraph with **bold** and *italic*.\n\n- List item 1\n- List item 2"}`
		article, err := ParseArticleJSON(raw)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if article.BodyMarkdown != expected {
			t.Errorf("body_markdown was not preserved correctly, got:\n%s", article.BodyMarkdown)
		}
	})

	t.Run("only braces with no content returns error", func(t *testing.T) {
		_, err := ParseArticleJSON("{}")
		if err == nil {
			t.Fatal("expected error for empty JSON object")
		}
	})
}
