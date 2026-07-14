package application

import (
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
	if !contains(prompt, "Article 1") {
		t.Error("expected Article 1 marker")
	}
	if !contains(prompt, "Article 2") {
		t.Error("expected Article 2 marker")
	}
	if !contains(prompt, "Go Generics") {
		t.Error("expected article title in prompt")
	}
	if !contains(prompt, "Rust vs Go") {
		t.Error("expected article title in prompt")
	}
	if !contains(prompt, "Go Blog") {
		t.Error("expected source name in prompt")
	}
}

func TestBuildDiscoveryPrompt_empty(t *testing.T) {
	prompt := BuildDiscoveryPrompt(nil, nil)
	if prompt == "" {
		t.Error("expected non-empty prompt even with no articles")
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && containsStr(s, substr)
}

func containsStr(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
