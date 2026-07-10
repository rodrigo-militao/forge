package application

import (
	"regexp"
	"strings"

	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

// ParseDiscoveryResponse parses the LLM classification response into
// HIGH and MEDIUM digest items. Returns two slices: high and medium.
func ParseDiscoveryResponse(response string, articles []digest.SourceItem) (high, medium []digest.DigestItem) {
	// Strip markdown code blocks — LLMs often wrap output in ```.
	response = stripCodeFences(response)

	linePattern := regexp.MustCompile(`^\s*(\d+)\s*[|\-,:]\s*(HIGH|MEDIUM|LOW)\s*[|\-,:]\s*(.+)$`)
	for _, line := range strings.Split(response, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		m := linePattern.FindStringSubmatch(line)
		if m == nil {
			continue
		}
		articleNum := atoi(m[1])
		classification := m[2]
		summary := strings.TrimSpace(m[3])

		if classification == "LOW" {
			continue
		}

		item := digest.DigestItem{
			Summary: summary,
			Score:   4,
			Status:  digest.ItemPending,
		}
		idx := articleNum - 1
		if idx >= 0 && idx < len(articles) {
			a := articles[idx]
			item.Title = a.Title
			item.URL = a.URL
			item.SourceName = a.SourceName
		} else {
			// Fallback: use first ~80 chars of summary as title
			item.Title = truncate(summary, 80)
		}

		switch classification {
		case "HIGH":
			item.Score = 5
			high = append(high, item)
		case "MEDIUM":
			medium = append(medium, item)
		}
	}
	return high, medium
}

// stripCodeFences removes markdown ``` ... ``` or ` ... ` around content.
func stripCodeFences(s string) string {
	s = strings.TrimSpace(s)
	// Remove leading ``` (possibly with language tag)
	s = regexp.MustCompile("(?s)^```[a-zA-Z0-9]*\n?").ReplaceAllString(s, "")
	// Remove trailing ```
	s = regexp.MustCompile("(?s)\n?```$").ReplaceAllString(s, "")
	// Remove inline backticks if that's all that's wrapping
	s = strings.TrimPrefix(s, "`")
	s = strings.TrimSuffix(s, "`")
	return strings.TrimSpace(s)
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}

func atoi(s string) int {
	n := 0
	for _, c := range s {
		if c >= '0' && c <= '9' {
			n = n*10 + int(c-'0')
		}
	}
	return n
}
