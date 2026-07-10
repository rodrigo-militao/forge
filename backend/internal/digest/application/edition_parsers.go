package application

import "strings"

// ParseEditionResponse extracts the title and introduction from the LLM
// edition assembly response.
func ParseEditionResponse(raw string) (introduction, title string) {
	lines := strings.Split(raw, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if strings.HasPrefix(line, "TITLE:") {
			title = strings.TrimSpace(strings.TrimPrefix(line, "TITLE:"))
		} else if strings.HasPrefix(line, "INTRODUCTION:") {
			introduction = strings.TrimSpace(strings.TrimPrefix(line, "INTRODUCTION:"))
		}
	}
	if title == "" {
		title = "Newsletter Edition"
	}
	return introduction, title
}
