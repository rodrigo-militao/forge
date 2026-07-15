package application

import (
	"encoding/json"
	"fmt"
	"strings"
)

type outlineJSON struct {
	Title    string `json:"title"`
	Sections []struct {
		Heading string   `json:"heading"`
		Points  []string `json:"points"`
	} `json:"sections"`
}

// ParseOutlineResponse parses the LLM outline response into a formatted string.
func ParseOutlineResponse(raw string) (string, error) {
	var oj outlineJSON
	if err := json.Unmarshal([]byte(raw), &oj); err == nil && oj.Title != "" && len(oj.Sections) > 0 {
		return formatOutline(oj), nil
	}
	start := strings.Index(raw, "{")
	end := strings.LastIndex(raw, "}")
	if start >= 0 && end > start {
		if err := json.Unmarshal([]byte(raw[start:end+1]), &oj); err == nil && oj.Title != "" && len(oj.Sections) > 0 {
			return formatOutline(oj), nil
		}
	}
	return "", fmt.Errorf("could not parse outline JSON from model output")
}

func formatOutline(oj outlineJSON) string {
	var sb strings.Builder
	sb.WriteString("# ")
	sb.WriteString(oj.Title)
	sb.WriteString("\n\n")
	for _, s := range oj.Sections {
		sb.WriteString("## ")
		sb.WriteString(s.Heading)
		sb.WriteString("\n")
		for _, p := range s.Points {
			sb.WriteString("- ")
			sb.WriteString(p)
			sb.WriteString("\n")
		}
		sb.WriteString("\n")
	}
	return sb.String()
}
