package application

import (
	"fmt"
	"strings"

	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

const discoverySystemPrompt = `You are a technical editorial curator.

Analyze each article and classify it as one of:
- HIGH: real case + concrete data or strong contrast + applicable technical lesson
- MEDIUM: solid technical content without specific case
- LOW: opinion without data, shallow news, generic content

For HIGH and MEDIUM articles, generate a 1-2 sentence summary in English.

Output format (one article per line):
ARTICLE_NUMBER | CLASSIFICATION | SUMMARY

IMPORTANT: Always include the article number as the first field. Match it to the "--- Article N ---" numbering in the input.`

// BuildDiscoveryPrompt formats articles into the LLM prompt for classification.
func BuildDiscoveryPrompt(articles []digest.SourceItem) string {
	var b strings.Builder
	b.WriteString("Analyze the following articles and classify each one:\n\n")
	for i, a := range articles {
		fmt.Fprintf(&b, "--- Article %d ---\n", i+1)
		fmt.Fprintf(&b, "Title: %s\n", a.Title)
		fmt.Fprintf(&b, "Source: %s\n", a.SourceName)
		fmt.Fprintf(&b, "URL: %s\n", a.URL)
		fmt.Fprintf(&b, "Content: %s\n", truncate(a.Content, 2000))
		b.WriteString("\n")
	}
	return b.String()
}
