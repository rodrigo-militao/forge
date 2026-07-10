package application

import (
	"testing"
)

func TestParseEditionResponse(t *testing.T) {
	t.Run("parses title and introduction", func(t *testing.T) {
		raw := "TITLE: Weekly Go Digest\nINTRODUCTION: This week we cover generics and concurrency patterns.\n"
		intro, title := ParseEditionResponse(raw)

		if title != "Weekly Go Digest" {
			t.Errorf("expected 'Weekly Go Digest', got '%s'", title)
		}
		if intro != "This week we cover generics and concurrency patterns." {
			t.Errorf("expected intro text, got '%s'", intro)
		}
	})

	t.Run("handles extra whitespace", func(t *testing.T) {
		raw := "  TITLE:  My Title  \n  INTRODUCTION:  My Intro  \n"
		intro, title := ParseEditionResponse(raw)

		if title != "My Title" {
			t.Errorf("expected 'My Title', got '%s'", title)
		}
		if intro != "My Intro" {
			t.Errorf("expected 'My Intro', got '%s'", intro)
		}
	})

	t.Run("defaults title when missing", func(t *testing.T) {
		raw := "INTRODUCTION: Just an intro\n"
		intro, title := ParseEditionResponse(raw)

		if title != "Newsletter Edition" {
			t.Errorf("expected default title 'Newsletter Edition', got '%s'", title)
		}
		if intro != "Just an intro" {
			t.Errorf("expected intro text, got '%s'", intro)
		}
	})

	t.Run("empty response", func(t *testing.T) {
		intro, title := ParseEditionResponse("")

		if title != "Newsletter Edition" {
			t.Errorf("expected default title, got '%s'", title)
		}
		if intro != "" {
			t.Errorf("expected empty intro, got '%s'", intro)
		}
	})
}
