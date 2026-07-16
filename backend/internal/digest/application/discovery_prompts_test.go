package application

import (
	"strings"
	"testing"

	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

func TestBuildDiscoveryPrompt(t *testing.T) {
	articles := []digest.SourceItem{
		{Title: "Go Generics", Content: "Article about Go generics and type parameters", URL: "https://example.com/1", SourceName: "Go Blog"},
		{Title: "Rust vs Go", Content: "A comparison of the two languages", URL: "https://example.com/2", SourceName: "Dev Blog"},
	}

	prompt := BuildDiscoveryPrompt(articles, nil)

	if prompt == "" {
		t.Fatal("expected non-empty prompt")
	}
	if !strings.Contains(prompt, "Article 1") {
		t.Error("expected Article 1 marker")
	}
	if !strings.Contains(prompt, "Article 2") {
		t.Error("expected Article 2 marker")
	}
	if !strings.Contains(prompt, "Go Generics") {
		t.Error("expected article title in prompt")
	}
	if !strings.Contains(prompt, "Rust vs Go") {
		t.Error("expected article title in prompt")
	}
	if !strings.Contains(prompt, "Go Blog") {
		t.Error("expected source name in prompt")
	}
	// Should NOT include interest section
	if strings.Contains(prompt, "The user is interested in") {
		t.Error("should not include interest section when no interests provided")
	}
}

func TestBuildDiscoveryPrompt_WithInterests(t *testing.T) {
	articles := []digest.SourceItem{
		{Title: "Go Generics", Content: "Article about Go generics", URL: "https://example.com/1", SourceName: "Go Blog"},
	}
	interests := []string{"Go", "Systems Programming"}

	prompt := BuildDiscoveryPrompt(articles, interests)

	if !strings.Contains(prompt, "The user is interested in: Go, Systems Programming.") {
		t.Error("expected interest section in prompt")
	}
	if !strings.Contains(prompt, "Prioritize articles matching these interests.") {
		t.Error("expected prioritize instruction in prompt")
	}
	if !strings.Contains(prompt, "Article 1") {
		t.Error("expected article marker")
	}
}

func TestBuildDiscoveryPrompt_SingleInterest(t *testing.T) {
	articles := []digest.SourceItem{
		{Title: "AI Advances", Content: "Latest in AI", URL: "https://example.com/ai", SourceName: "AI Blog"},
	}

	prompt := BuildDiscoveryPrompt(articles, []string{"AI"})

	if !strings.Contains(prompt, "The user is interested in: AI.") {
		t.Errorf("expected single interest 'AI', got: %s", prompt)
	}
}

func TestBuildDiscoveryPrompt_EmptyArticles(t *testing.T) {
	prompt := BuildDiscoveryPrompt(nil, nil)
	if prompt == "" {
		t.Error("expected non-empty prompt even with no articles")
	}
	// Should still contain the header line
	if !strings.Contains(prompt, "Analyze the following articles") {
		t.Error("expected analysis header in prompt")
	}
}

func TestBuildDiscoveryPrompt_EmptyArticlesWithInterests(t *testing.T) {
	prompt := BuildDiscoveryPrompt(nil, []string{"AI"})
	if !strings.Contains(prompt, "The user is interested in: AI.") {
		t.Error("expected interest section even with no articles")
	}
}

func TestBuildDiscoveryPrompt_ContentTruncation(t *testing.T) {
	// Content with distinct boundary: first 2000 chars are "a", remaining are "b"
	longContent := strings.Repeat("a", 2000) + strings.Repeat("b", 1000)

	articles := []digest.SourceItem{
		{Title: "Long Article", Content: longContent, URL: "https://example.com/long", SourceName: "Blog"},
	}

	prompt := BuildDiscoveryPrompt(articles, nil)

	// First 2000 chars should be in prompt
	if !strings.Contains(prompt, strings.Repeat("a", 2000)) {
		t.Error("expected first 2000 chars of content in prompt")
	}
	// Content beyond 2000 chars should NOT be in the prompt
	if strings.Contains(prompt, "b") {
		t.Error("prompt should not contain content beyond 2000 chars")
	}
}

func TestBuildDiscoveryPrompt_SingleArticle(t *testing.T) {
	articles := []digest.SourceItem{
		{Title: "Only One", Content: "Single article", URL: "https://example.com/1", SourceName: "Blog"},
	}

	prompt := BuildDiscoveryPrompt(articles, nil)

	if !strings.Contains(prompt, "Article 1") {
		t.Error("expected Article 1 marker")
	}
	if strings.Contains(prompt, "Article 2") {
		t.Error("should not have Article 2 marker with single article")
	}
}

func TestBuildDiscoveryPrompt_URLIncluded(t *testing.T) {
	articles := []digest.SourceItem{
		{Title: "Test", Content: "content", URL: "https://example.com/article", SourceName: "Source"},
	}

	prompt := BuildDiscoveryPrompt(articles, nil)

	if !strings.Contains(prompt, "https://example.com/article") {
		t.Error("expected URL in prompt")
	}
}

func TestBuildDiscoveryPrompt_SourceNameIncluded(t *testing.T) {
	articles := []digest.SourceItem{
		{Title: "Test", Content: "content", URL: "https://example.com/1", SourceName: "My Custom Source"},
	}

	prompt := BuildDiscoveryPrompt(articles, nil)

	if !strings.Contains(prompt, "Source: My Custom Source") {
		t.Error("expected source name in prompt")
	}
}
