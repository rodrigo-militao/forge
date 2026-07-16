package rss

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

const testRSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>Test Feed</title>
<link>https://example.com</link>
<description>Test feed description</description>
<item>
<title>Article One</title>
<link>https://example.com/1</link>
<description>Description of article one</description>
<guid>guid-1</guid>
<pubDate>Mon, 15 Jul 2026 12:00:00 GMT</pubDate>
</item>
<item>
<title>Article Two</title>
<link>https://example.com/2</link>
<description>Description of article two</description>
<guid>guid-2</guid>
<pubDate>Sun, 14 Jul 2026 12:00:00 GMT</pubDate>
</item>
</channel>
</rss>`

const testAtom = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<title>Atom Test Feed</title>
<link href="https://example.com"/>
<entry>
<title>Atom Article</title>
<link href="https://example.com/atom-1"/>
<summary>Atom article summary</summary>
<id>atom-guid-1</id>
<published>2026-07-15T12:00:00Z</published>
</entry>
</feed>`

func TestFeed_Name(t *testing.T) {
	f := NewFeed("My Feed", "https://example.com/feed.xml")
	if name := f.Name(); name != "My Feed" {
		t.Errorf("expected 'My Feed', got %q", name)
	}
}

func TestNewFeed(t *testing.T) {
	f := NewFeed("Test", "https://example.com/rss")
	if f.name != "Test" {
		t.Errorf("expected name 'Test', got %q", f.name)
	}
	if f.url != "https://example.com/rss" {
		t.Errorf("expected URL 'https://example.com/rss', got %q", f.url)
	}
	if f.parser == nil {
		t.Error("expected non-nil parser")
	}
}

func TestFetch_rss_success(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/rss+xml")
		w.Write([]byte(testRSS))
	}))
	defer srv.Close()

	f := NewFeed("Test Feed", srv.URL)
	ctx := context.Background()
	items, err := f.Fetch(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(items))
	}
	if items[0].Title != "Article One" {
		t.Errorf("expected 'Article One', got %q", items[0].Title)
	}
	if items[0].URL != "https://example.com/1" {
		t.Errorf("expected 'https://example.com/1', got %q", items[0].URL)
	}
	if items[0].SourceName != "Test Feed" {
		t.Errorf("expected 'Test Feed', got %q", items[0].SourceName)
	}
	if items[0].SourceURL != srv.URL {
		t.Errorf("expected source URL %q, got %q", srv.URL, items[0].SourceURL)
	}
	if items[1].Title != "Article Two" {
		t.Errorf("expected 'Article Two', got %q", items[1].Title)
	}
}

func TestFetch_atom_success(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/atom+xml")
		w.Write([]byte(testAtom))
	}))
	defer srv.Close()

	f := NewFeed("Atom Feed", srv.URL)
	ctx := context.Background()
	items, err := f.Fetch(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
	if items[0].Title != "Atom Article" {
		t.Errorf("expected 'Atom Article', got %q", items[0].Title)
	}
	if items[0].URL != "https://example.com/atom-1" {
		t.Errorf("expected 'https://example.com/atom-1', got %q", items[0].URL)
	}
}

func TestFetch_atom_usesUpdatedParsed(t *testing.T) {
	// Atom entry with <updated> but no <published> — exercises UpdatedParsed branch.
	const atomUpdated = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<title>Updated Feed</title>
<link href="https://example.com"/>
<entry>
<title>Updated Article</title>
<link href="https://example.com/updated-1"/>
<summary>Updated article summary</summary>
<id>updated-guid-1</id>
<updated>2026-07-15T12:00:00Z</updated>
</entry>
</feed>`

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/atom+xml")
		w.Write([]byte(atomUpdated))
	}))
	defer srv.Close()

	f := NewFeed("Updated Feed", srv.URL)
	ctx := context.Background()
	items, err := f.Fetch(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 item, got %d", len(items))
	}
	if items[0].Title != "Updated Article" {
		t.Errorf("expected 'Updated Article', got %q", items[0].Title)
	}
	if items[0].PublishedAt.IsZero() {
		t.Error("expected non-zero PublishedAt from UpdatedParsed")
	}
}

func TestFetch_deduplicatesByGUID(t *testing.T) {
	rss := `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>Test</title>
<item>
<title>Dup Article</title>
<link>https://example.com/dup</link>
<guid>same-guid</guid>
<pubDate>Mon, 15 Jul 2026 12:00:00 GMT</pubDate>
</item>
<item>
<title>Dup Article</title>
<link>https://example.com/dup</link>
<guid>same-guid</guid>
<pubDate>Mon, 15 Jul 2026 12:00:00 GMT</pubDate>
</item>
</channel>
</rss>`

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/rss+xml")
		w.Write([]byte(rss))
	}))
	defer srv.Close()

	f := NewFeed("Test", srv.URL)
	ctx := context.Background()
	items, err := f.Fetch(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 1 {
		t.Errorf("expected 1 item after dedup, got %d", len(items))
	}
}

func TestFetch_deduplicatesByLinkWhenNoGUID(t *testing.T) {
	rss := `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>Test</title>
<item>
<title>No GUID</title>
<link>https://example.com/no-guid</link>
<pubDate>Mon, 15 Jul 2026 12:00:00 GMT</pubDate>
</item>
<item>
<title>No GUID Again</title>
<link>https://example.com/no-guid</link>
<pubDate>Mon, 15 Jul 2026 12:00:00 GMT</pubDate>
</item>
</channel>
</rss>`

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/rss+xml")
		w.Write([]byte(rss))
	}))
	defer srv.Close()

	f := NewFeed("Test", srv.URL)
	ctx := context.Background()
	items, err := f.Fetch(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 1 {
		t.Errorf("expected 1 item after dedup by link, got %d", len(items))
	}
}

func TestFetch_skipNoLinkNoGUID(t *testing.T) {
	rss := `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>Test</title>
<item>
<title>No link or GUID</title>
</item>
</channel>
</rss>`

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/rss+xml")
		w.Write([]byte(rss))
	}))
	defer srv.Close()

	f := NewFeed("Test", srv.URL)
	ctx := context.Background()
	items, err := f.Fetch(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 0 {
		t.Errorf("expected 0 items, got %d", len(items))
	}
}

func TestFetch_oldArticleSkipped(t *testing.T) {
	// Article published more than 7 days ago should be skipped
	oldDate := time.Now().Add(-10 * 24 * time.Hour).Format(time.RFC1123)
	rss := `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>Test</title>
<item>
<title>Old Article</title>
<link>https://example.com/old</link>
<guid>old-guid</guid>
<pubDate>` + oldDate + `</pubDate>
</item>
</channel>
</rss>`

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/rss+xml")
		w.Write([]byte(rss))
	}))
	defer srv.Close()

	f := NewFeed("Test", srv.URL)
	ctx := context.Background()
	items, err := f.Fetch(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 0 {
		t.Errorf("expected 0 items (old article skipped), got %d", len(items))
	}
}

func TestFetch_httpError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	f := NewFeed("Test", srv.URL)
	ctx := context.Background()
	_, err := f.Fetch(ctx)
	if err == nil {
		t.Fatal("expected error for HTTP 500")
	}
}

func TestFetch_invalidURL(t *testing.T) {
	f := NewFeed("Test", "http://127.0.0.1:1/nonexistent")
	// Use a short timeout context
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Millisecond)
	defer cancel()
	_, err := f.Fetch(ctx)
	if err == nil {
		t.Fatal("expected error for invalid URL")
	}
}

func TestFetch_contextCancelled(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(5 * time.Second)
	}))
	defer srv.Close()

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	f := NewFeed("Test", srv.URL)
	_, err := f.Fetch(ctx)
	if err == nil {
		t.Fatal("expected error for cancelled context")
	}
}
