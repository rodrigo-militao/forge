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
		if len(medium) > 0 && medium[0].Score != 4 {
			t.Errorf("expected score 4 for MEDIUM, got %d", medium[0].Score)
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

	t.Run("comma delimiter", func(t *testing.T) {
		response := "1, HIGH, Great article\n2, MEDIUM, Solid post\n"
		high, medium := ParseDiscoveryResponse(response, articles)
		if len(high) != 1 {
			t.Errorf("expected 1 high with comma delimiter, got %d", len(high))
		}
		if len(medium) != 1 {
			t.Errorf("expected 1 medium with comma delimiter, got %d", len(medium))
		}
	})

	t.Run("dash delimiter", func(t *testing.T) {
		response := "1 - HIGH - Great article\n2 - MEDIUM - Solid post\n"
		high, medium := ParseDiscoveryResponse(response, articles)
		if len(high) != 1 {
			t.Errorf("expected 1 high with dash delimiter, got %d", len(high))
		}
		if len(medium) != 1 {
			t.Errorf("expected 1 medium with dash delimiter, got %d", len(medium))
		}
	})

	t.Run("colon delimiter", func(t *testing.T) {
		response := "1: HIGH: Great article\n2: MEDIUM: Solid post\n"
		high, medium := ParseDiscoveryResponse(response, articles)
		if len(high) != 1 {
			t.Errorf("expected 1 high with colon delimiter, got %d", len(high))
		}
		if len(medium) != 1 {
			t.Errorf("expected 1 medium with colon delimiter, got %d", len(medium))
		}
	})

	t.Run("leading/trailing whitespace on lines", func(t *testing.T) {
		response := "  1 | HIGH | Great article  \n  \t2 | MEDIUM | Solid post\n"
		high, medium := ParseDiscoveryResponse(response, articles)
		if len(high) != 1 {
			t.Errorf("expected 1 high with whitespace, got %d", len(high))
		}
		if len(medium) != 1 {
			t.Errorf("expected 1 medium with whitespace, got %d", len(medium))
		}
	})

	t.Run("only low classifications", func(t *testing.T) {
		response := "1 | LOW | Just opinion\n2 | LOW | Shallow content\n"
		high, medium := ParseDiscoveryResponse(response, articles)
		if len(high) != 0 {
			t.Errorf("expected 0 high for only LOW, got %d", len(high))
		}
		if len(medium) != 0 {
			t.Errorf("expected 0 medium for only LOW, got %d", len(medium))
		}
	})

	t.Run("mixed valid and invalid lines", func(t *testing.T) {
		response := "1 | HIGH | Great article\nsome noise\n2 | MEDIUM | Solid post\n\n\n"
		high, medium := ParseDiscoveryResponse(response, articles)
		if len(high) != 1 {
			t.Errorf("expected 1 high with mixed lines, got %d", len(high))
		}
		if len(medium) != 1 {
			t.Errorf("expected 1 medium with mixed lines, got %d", len(medium))
		}
	})

	t.Run("inline backtick wrapping", func(t *testing.T) {
		response := "`1 | HIGH | Great article`"
		high, _ := ParseDiscoveryResponse(response, articles)
		if len(high) != 1 {
			t.Errorf("expected 1 high with inline backticks, got %d", len(high))
		}
	})

	t.Run("article index zero is invalid", func(t *testing.T) {
		response := "0 | HIGH | Some article\n"
		high, _ := ParseDiscoveryResponse(response, articles)
		// idx would be -1, should use fallback title
		if len(high) != 1 {
			t.Fatalf("expected 1 high, got %d", len(high))
		}
		if high[0].Title == articles[0].Title {
			t.Error("expected fallback title for index 0 (out of range)")
		}
	})
}

// --- Internal helper tests ---

func Test_stripCodeFences(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "triple backtick block",
			input: "```\ncontent here\n```",
			want:  "content here",
		},
		{
			name:  "triple backtick with language tag",
			input: "```json\n{\"key\": \"value\"}\n```",
			want:  "{\"key\": \"value\"}",
		},
		{
			name:  "inline backticks",
			input: "`some content`",
			want:  "some content",
		},
		{
			name:  "no fences",
			input: "plain content",
			want:  "plain content",
		},
		{
			name:  "empty string",
			input: "",
			want:  "",
		},
		{
			name:  "only backticks",
			input: "``",
			want:  "",
		},
		{
			name:  "whitespace around fences",
			input: "  ```\ncontent\n```  ",
			want:  "content",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := stripCodeFences(tt.input)
			if got != tt.want {
				t.Errorf("stripCodeFences() = %q, want %q", got, tt.want)
			}
		})
	}
}

func Test_truncate(t *testing.T) {
	tests := []struct {
		name string
		s    string
		n    int
		want string
	}{
		{name: "shorter than limit", s: "hello", n: 10, want: "hello"},
		{name: "equal to limit", s: "hello", n: 5, want: "hello"},
		{name: "longer than limit", s: "hello world", n: 5, want: "hello"},
		{name: "empty string", s: "", n: 10, want: ""},
		{name: "zero limit", s: "hello", n: 0, want: ""},
		{name: "unicode string truncation", s: "abcdefghijklmnop", n: 5, want: "abcde"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := truncate(tt.s, tt.n)
			if got != tt.want {
				t.Errorf("truncate() = %q, want %q", got, tt.want)
			}
		})
	}
}

func Test_atoi(t *testing.T) {
	tests := []struct {
		name string
		s    string
		want int
	}{
		{name: "simple number", s: "42", want: 42},
		{name: "zero", s: "0", want: 0},
		{name: "large number", s: "999", want: 999},
		{name: "leading whitespace", s: "  123", want: 123},
		{name: "non-digit prefix", s: "abc45", want: 45},
		{name: "mixed with letters", s: "12abc34", want: 1234},
		{name: "empty string", s: "", want: 0},
		{name: "only non-digits", s: "abc", want: 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := atoi(tt.s)
			if got != tt.want {
				t.Errorf("atoi() = %d, want %d", got, tt.want)
			}
		})
	}
}
