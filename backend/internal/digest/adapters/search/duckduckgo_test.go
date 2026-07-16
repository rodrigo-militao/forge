package search

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestDuckDuckGo_Name(t *testing.T) {
	d := NewDuckDuckGo([]string{"test"})
	if name := d.Name(); name != "Web Search" {
		t.Errorf("expected 'Web Search', got %q", name)
	}
}

func TestNewDuckDuckGo_defaultClient(t *testing.T) {
	d := NewDuckDuckGo([]string{"test"})
	if d.client == nil {
		t.Fatal("expected non-nil http client")
	}
	if d.client.Timeout != 15*time.Second {
		t.Errorf("expected timeout 15s, got %v", d.client.Timeout)
	}
}

func TestNewDuckDuckGo_withOptions(t *testing.T) {
	custom := &http.Client{Timeout: 5 * time.Second}
	d := NewDuckDuckGo([]string{"test"}, WithHTTPClient(custom))
	if d.client != custom {
		t.Error("expected custom http client")
	}
}

func TestFetch_success_withResultLinks(t *testing.T) {
	html := `<!DOCTYPE html>
<html><body>
<div class="result-link"><a href="https://example.com/article1">Article One</a></div>
<div class="result-link"><a href="https://example.com/article2">Article Two</a></div>
</body></html>`

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}
		if r.Header.Get("Content-Type") != "application/x-www-form-urlencoded" {
			t.Errorf("expected form content type, got %s", r.Header.Get("Content-Type"))
		}
		w.Write([]byte(html))
	}))
	defer srv.Close()

	// Override the package-level URL
	originalURL := duckDuckGoURL
	duckDuckGoURL = srv.URL
	defer func() { duckDuckGoURL = originalURL }()

	d := NewDuckDuckGo([]string{"golang"}, WithHTTPClient(srv.Client()))
	ctx := context.Background()
	items, err := d.Fetch(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(items))
	}
	if items[0].Title != "Article One" {
		t.Errorf("expected 'Article One', got %q", items[0].Title)
	}
	if items[0].URL != "https://example.com/article1" {
		t.Errorf("expected article1 URL, got %q", items[0].URL)
	}
	if !strings.Contains(items[0].SourceName, "golang") {
		t.Errorf("expected source name to contain 'golang', got %q", items[0].SourceName)
	}
}

func TestFetch_success_withFallbackLinks(t *testing.T) {
	// HTML without .result-link elements — should fall back to <a> tags
	html := `<!DOCTYPE html>
<html><body>
<a href="https://example.com/long-article-title-here">This is a sufficiently long article</a>
<a href="/relative-link">Short</a>
<a href="https://example.com/another">Another long enough title</a>
</body></html>`

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(html))
	}))
	defer srv.Close()

	originalURL := duckDuckGoURL
	duckDuckGoURL = srv.URL
	defer func() { duckDuckGoURL = originalURL }()

	d := NewDuckDuckGo([]string{"test"}, WithHTTPClient(srv.Client()))
	ctx := context.Background()
	items, err := d.Fetch(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Should skip /relative-link (starts with /) and "Short" (< 10 chars)
	if len(items) != 2 {
		t.Fatalf("expected 2 items from fallback, got %d", len(items))
	}
}

func TestFetch_deduplicatesByURL(t *testing.T) {
	html := `<!DOCTYPE html>
<html><body>
<div class="result-link"><a href="https://example.com/article">Article One</a></div>
<div class="result-link"><a href="https://example.com/article">Article One</a></div>
</body></html>`

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(html))
	}))
	defer srv.Close()

	originalURL := duckDuckGoURL
	duckDuckGoURL = srv.URL
	defer func() { duckDuckGoURL = originalURL }()

	d := NewDuckDuckGo([]string{"test", "test"}, WithHTTPClient(srv.Client()))
	ctx := context.Background()
	items, err := d.Fetch(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) > 1 {
		t.Errorf("expected deduplication, got %d items", len(items))
	}
}

func TestFetch_emptyResults(t *testing.T) {
	html := `<!DOCTYPE html>
<html><body></body></html>`

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(html))
	}))
	defer srv.Close()

	originalURL := duckDuckGoURL
	duckDuckGoURL = srv.URL
	defer func() { duckDuckGoURL = originalURL }()

	d := NewDuckDuckGo([]string{"test"}, WithHTTPClient(srv.Client()))
	ctx := context.Background()
	items, err := d.Fetch(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 0 {
		t.Errorf("expected 0 items, got %d", len(items))
	}
}

func TestFetch_httpError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	originalURL := duckDuckGoURL
	duckDuckGoURL = srv.URL
	defer func() { duckDuckGoURL = originalURL }()

	// With multiple queries, one failure should be skipped and others continue
	d := NewDuckDuckGo([]string{"test"}, WithHTTPClient(srv.Client()))
	ctx := context.Background()
	items, err := d.Fetch(ctx)
	if err != nil {
		t.Fatalf("expected error to be swallowed, got %v", err)
	}
	if len(items) != 0 {
		t.Errorf("expected 0 items on HTTP error, got %d", len(items))
	}
}

func TestFetch_contextCancelled(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		time.Sleep(5 * time.Second)
	}))
	defer srv.Close()

	originalURL := duckDuckGoURL
	duckDuckGoURL = srv.URL
	defer func() { duckDuckGoURL = originalURL }()

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	d := NewDuckDuckGo([]string{"test"}, WithHTTPClient(srv.Client()))
	_, err := d.Fetch(ctx)
	if err == nil {
		t.Fatal("expected error for cancelled context")
	}
}

func TestFetch_skipsEmptyURL(t *testing.T) {
	html := `<!DOCTYPE html>
<html><body>
<div class="result-link"><a href="">Empty link</a></div>
<div class="result-link"><a href="https://example.com/valid">Valid Article</a></div>
</body></html>`

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte(html))
	}))
	defer srv.Close()

	originalURL := duckDuckGoURL
	duckDuckGoURL = srv.URL
	defer func() { duckDuckGoURL = originalURL }()

	d := NewDuckDuckGo([]string{"test"}, WithHTTPClient(srv.Client()))
	ctx := context.Background()
	items, err := d.Fetch(ctx)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 1 {
		t.Errorf("expected 1 item (skipping empty URL), got %d", len(items))
	}
}

func TestParseResults_resultLinks(t *testing.T) {
	html := `<html><body>
<div class="result-link"><a href="https://example.com/1">First Article</a></div>
<div class="result-link"><a href="https://example.com/2">Second Article</a></div>
</body></html>`

	items, err := parseResults([]byte(html), "test query")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(items))
	}
	if items[0].Title != "First Article" {
		t.Errorf("expected 'First Article', got %q", items[0].Title)
	}
}

func TestParseResults_noResultLinks(t *testing.T) {
	html := `<html><body>
<a href="https://example.com/article-one">This is a long enough title here</a>
<a href="https://example.com/article-two">Another sufficiently long title</a>
</body></html>`

	items, err := parseResults([]byte(html), "test")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) == 0 {
		t.Fatal("expected fallback items")
	}
}

func TestParseResults_shortTitleSkipped(t *testing.T) {
	html := `<html><body>
<a href="https://example.com/1">Short</a>
<a href="https://example.com/2">This is a sufficiently long title</a>
</body></html>`

	items, err := parseResults([]byte(html), "test")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 1 {
		t.Errorf("expected 1 item (short title skipped), got %d", len(items))
	}
}

func TestParseResults_invalidHTML(t *testing.T) {
	// goquery is forgiving with malformed HTML, but we can test empty body
	items, err := parseResults([]byte(""), "test")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 0 {
		t.Errorf("expected 0 items for empty HTML, got %d", len(items))
	}
}

// We use a package-level variable that gets restored. Verify it works.
func TestDuckDuckGoURL_var(t *testing.T) {
	// Just ensure the default is set
	if duckDuckGoURL != "https://lite.duckduckgo.com/lite/" {
		t.Errorf("unexpected default URL: %s", duckDuckGoURL)
	}
}

// --- Tests for uncovered branches ---

func TestParseResults_resultLinkWithHrefOnDiv(t *testing.T) {
	// The code checks s.Attr("href") on .result-link elements directly.
	// Provide href on the div itself to exercise that code path.
	html := `<html><body>
<div class="result-link" href="https://example.com/article1">First Article</div>
<div class="result-link" href="https://example.com/article2">Second Article</div>
</body></html>`

	items, err := parseResults([]byte(html), "test query")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(items))
	}
	if items[0].Title != "First Article" {
		t.Errorf("expected 'First Article', got %q", items[0].Title)
	}
	if items[1].URL != "https://example.com/article2" {
		t.Errorf("expected 'https://example.com/article2', got %q", items[1].URL)
	}
}

func TestParseResults_emptyTitleInResultLink(t *testing.T) {
	// Result-link with href but whitespace-only title — exercises title == "" branch.
	html := `<html><body>
<div class="result-link" href="https://example.com/article1">   </div>
<div class="result-link" href="https://example.com/article2">Valid Title</div>
</body></html>`

	items, err := parseResults([]byte(html), "test")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("expected 1 item (one with empty title skipped), got %d", len(items))
	}
	if items[0].Title != "Valid Title" {
		t.Errorf("expected 'Valid Title', got %q", items[0].Title)
	}
}

func TestSearch_newRequestWithContextError(t *testing.T) {
	// An invalid URL causes http.NewRequestWithContext to return an error.
	originalURL := duckDuckGoURL
	duckDuckGoURL = "://invalid-url"
	defer func() { duckDuckGoURL = originalURL }()

	d := NewDuckDuckGo([]string{"test"})
	ctx := context.Background()
	_, err := d.search(ctx, "test")
	if err == nil {
		t.Fatal("expected error for invalid URL")
	}
}

type failReadCloser struct {
	io.Reader
}

func (failReadCloser) Close() error { return nil }

func (r *failReadCloser) Read(p []byte) (int, error) {
	return 0, errors.New("simulated read failure")
}

type failBodyTransport struct{}

func (failBodyTransport) RoundTrip(*http.Request) (*http.Response, error) {
	return &http.Response{
		StatusCode: http.StatusOK,
		Body:       &failReadCloser{strings.NewReader("")},
	}, nil
}

func TestSearch_ioReadAllError(t *testing.T) {
	d := &DuckDuckGo{
		queries: []string{"test"},
		client:  &http.Client{Transport: failBodyTransport{}, Timeout: 5 * time.Second},
	}
	ctx := context.Background()
	_, err := d.search(ctx, "test")
	if err == nil {
		t.Fatal("expected error from failing body read")
	}
	if !strings.Contains(err.Error(), "simulated read failure") {
		t.Errorf("unexpected error: %v", err)
	}
}

type failDoTransport struct{}

func (failDoTransport) RoundTrip(*http.Request) (*http.Response, error) {
	return nil, errors.New("connection refused")
}

func TestSearch_httpClientDoError(t *testing.T) {
	d := &DuckDuckGo{
		queries: []string{"test"},
		client:  &http.Client{Transport: failDoTransport{}, Timeout: 5 * time.Second},
	}
	ctx := context.Background()
	_, err := d.search(ctx, "test")
	if err == nil {
		t.Fatal("expected error from failing transport")
	}
	if !strings.Contains(err.Error(), "connection refused") {
		t.Errorf("unexpected error: %v", err)
	}
}
