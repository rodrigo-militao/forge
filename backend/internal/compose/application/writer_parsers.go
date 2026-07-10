package application

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/rodrigo-militao/forge/internal/compose/domain"
)

type articleJSON struct {
	Title        string `json:"title"`
	Subtitle     string `json:"subtitle"`
	BodyMarkdown string `json:"body_markdown"`
}

// ParseArticleJSON parses the LLM article response into an Article domain type.
func ParseArticleJSON(raw string) (*domain.Article, error) {
	var aj articleJSON
	if err := json.Unmarshal([]byte(raw), &aj); err == nil && aj.Title != "" && aj.BodyMarkdown != "" {
		return mapArticle(aj), nil
	}
	start := strings.Index(raw, "{")
	end := strings.LastIndex(raw, "}")
	if start >= 0 && end > start {
		if err := json.Unmarshal([]byte(raw[start:end+1]), &aj); err == nil && aj.Title != "" && aj.BodyMarkdown != "" {
			return mapArticle(aj), nil
		}
	}
	return nil, fmt.Errorf("could not parse article JSON from model output")
}

func mapArticle(aj articleJSON) *domain.Article {
	return &domain.Article{
		Title:        aj.Title,
		Subtitle:     aj.Subtitle,
		BodyMarkdown: aj.BodyMarkdown,
	}
}
