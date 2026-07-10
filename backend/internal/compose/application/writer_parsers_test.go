package application

import (
	"testing"
)

func TestParseArticleJSON(t *testing.T) {
	t.Run("parses valid JSON", func(t *testing.T) {
		raw := `{"title":"My Article","subtitle":"A subtitle","body_markdown":"# Content\n\nBody here"}`
		article, err := ParseArticleJSON(raw)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if article.Title != "My Article" {
			t.Errorf("expected 'My Article', got '%s'", article.Title)
		}
		if article.Subtitle != "A subtitle" {
			t.Errorf("expected 'A subtitle', got '%s'", article.Subtitle)
		}
		if article.BodyMarkdown != "# Content\n\nBody here" {
			t.Errorf("unexpected body: '%s'", article.BodyMarkdown)
		}
	})

	t.Run("extracts JSON from code blocks", func(t *testing.T) {
		raw := "```json\n{\"title\":\"Wrapped\",\"body_markdown\":\"Content\"}\n```"
		article, err := ParseArticleJSON(raw)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if article.Title != "Wrapped" {
			t.Errorf("expected 'Wrapped', got '%s'", article.Title)
		}
	})

	t.Run("extracts JSON from surrounding text", func(t *testing.T) {
		raw := "Here is the article:\n{\"title\":\"Embedded\",\"subtitle\":\"Found it\",\"body_markdown\":\"Content here\"}\n\nLet me know if you need changes."
		article, err := ParseArticleJSON(raw)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if article.Title != "Embedded" {
			t.Errorf("expected 'Embedded', got '%s'", article.Title)
		}
	})

	t.Run("empty input", func(t *testing.T) {
		_, err := ParseArticleJSON("")
		if err == nil {
			t.Error("expected error for empty input")
		}
	})

	t.Run("no JSON in input", func(t *testing.T) {
		_, err := ParseArticleJSON("Just some random text without JSON")
		if err == nil {
			t.Error("expected error for non-JSON input")
		}
	})

	t.Run("missing required fields", func(t *testing.T) {
		raw := `{"title":"","subtitle":"","body_markdown":""}`
		_, err := ParseArticleJSON(raw)
		if err == nil {
			t.Error("expected error for missing fields")
		}
	})
}
