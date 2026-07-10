package application

import (
	"testing"

	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

func TestParseDiscoveryResponse(t *testing.T) {
	articles := []digest.SourceItem{
		{Title: "Go Generics", URL: "https://example.com/1", SourceName: "Blog"},
		{Title: "Rust vs Go", URL: "https://example.com/2", SourceName: "Blog"},
		{Title: "Opinion Piece", URL: "https://example.com/3", SourceName: "Blog"},
	}

	t.Run("parses high medium and low", func(t *testing.T) {
		response := "1 | HIGH | Great article about Go generics\n2 | MEDIUM | Solid comparison\n3 | LOW | Just an opinion\n"
		high, medium := ParseDiscoveryResponse(response, articles)

		if len(high) != 1 {
			t.Errorf("expected 1 high, got %d", len(high))
		}
		if len(medium) != 1 {
			t.Errorf("expected 1 medium, got %d", len(medium))
		}
		if len(high) > 0 && high[0].Title != "Go Generics" {
			t.Errorf("expected title 'Go Generics', got '%s'", high[0].Title)
		}
		if len(high) > 0 && high[0].Score != 5 {
			t.Errorf("expected score 5 for HIGH, got %d", high[0].Score)
		}
	})

	t.Run("handles markdown code fences", func(t *testing.T) {
		response := "```\n1 | HIGH | Great article\n2 | MEDIUM | Solid post\n```"
		high, medium := ParseDiscoveryResponse(response, articles)

		if len(high) != 1 {
			t.Errorf("expected 1 high, got %d", len(high))
		}
		if len(medium) != 1 {
			t.Errorf("expected 1 medium, got %d", len(medium))
		}
	})

	t.Run("handles pipe delimiter with spaces", func(t *testing.T) {
		response := "1 | HIGH | Summary with | pipe in text\n"
		high, _ := ParseDiscoveryResponse(response, articles)

		if len(high) != 1 {
			t.Errorf("expected 1 high, got %d", len(high))
		}
	})

	t.Run("out of range article index uses summary as fallback title", func(t *testing.T) {
		response := "99 | HIGH | Fallback title here\n"
		high, _ := ParseDiscoveryResponse(response, articles)

		if len(high) != 1 {
			t.Fatalf("expected 1 high, got %d", len(high))
		}
		if high[0].Title == "Go Generics" {
			t.Error("expected fallback title, not from articles list")
		}
		if high[0].SourceName != "" {
			t.Error("expected empty source name for out-of-range index")
		}
	})

	t.Run("empty response", func(t *testing.T) {
		high, medium := ParseDiscoveryResponse("", articles)
		if len(high) != 0 {
			t.Error("expected 0 high for empty response")
		}
		if len(medium) != 0 {
			t.Error("expected 0 medium for empty response")
		}
	})

	t.Run("no matching lines", func(t *testing.T) {
		high, medium := ParseDiscoveryResponse("Some random text\nwith no matches\n", articles)
		if len(high) != 0 {
			t.Error("expected 0 high for non-matching response")
		}
		if len(medium) != 0 {
			t.Error("expected 0 medium for non-matching response")
		}
	})
}
