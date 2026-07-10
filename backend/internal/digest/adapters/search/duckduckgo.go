// Package search implements digest.ContentSource via DuckDuckGo web search.
package search

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"

	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

var duckDuckGoURL = "https://lite.duckduckgo.com/lite/"

// DuckDuckGo implements ContentSource using DuckDuckGo's free search API.
type DuckDuckGo struct {
	queries []string
	client  *http.Client
}

// NewDuckDuckGo creates a web search source with the given search queries.
func NewDuckDuckGo(queries []string) *DuckDuckGo {
	return &DuckDuckGo{
		queries: queries,
		client:  &http.Client{Timeout: 15 * time.Second},
	}
}

// Name returns the source name.
func (d *DuckDuckGo) Name() string {
	return "Web Search"
}

// Fetch executes all search queries and returns results as source items.
func (d *DuckDuckGo) Fetch(ctx context.Context) ([]digest.SourceItem, error) {
	var allArticles []digest.SourceItem
	seen := make(map[string]bool)

	for _, q := range d.queries {
		select {
		case <-ctx.Done():
			return allArticles, ctx.Err()
		default:
		}

		articles, err := d.search(ctx, q)
		if err != nil {
			continue
		}

		for _, a := range articles {
			if a.URL == "" || seen[a.URL] {
				continue
			}
			seen[a.URL] = true
			allArticles = append(allArticles, a)
		}

		time.Sleep(1200 * time.Millisecond)
	}

	return allArticles, nil
}

func (d *DuckDuckGo) search(ctx context.Context, query string) ([]digest.SourceItem, error) {
	form := url.Values{"q": {query}}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, duckDuckGoURL, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "Mozilla/5.0")

	resp, err := d.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("executing search: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("search returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	return parseResults(body, query)
}

func parseResults(body []byte, query string) ([]digest.SourceItem, error) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(string(body)))
	if err != nil {
		return nil, fmt.Errorf("parsing HTML: %w", err)
	}

	var articles []digest.SourceItem
	doc.Find(".result-link").Each(func(i int, s *goquery.Selection) {
		href, exists := s.Attr("href")
		if !exists || href == "" {
			return
		}

		title := strings.TrimSpace(s.Text())
		if title == "" {
			return
		}

		articles = append(articles, digest.SourceItem{
			Title:      title,
			URL:        href,
			SourceName: "Web Search (" + query + ")",
			Content:    title,
		})
	})

	if len(articles) == 0 {
		doc.Find("a").Each(func(i int, s *goquery.Selection) {
			href, exists := s.Attr("href")
			if !exists || href == "" || strings.HasPrefix(href, "/") {
				return
			}
			title := strings.TrimSpace(s.Text())
			if title == "" || len(title) < 10 {
				return
			}
			articles = append(articles, digest.SourceItem{
				Title:      title,
				URL:        href,
				SourceName: "Web Search (" + query + ")",
				Content:    title,
			})
		})
	}

	return articles, nil
}
