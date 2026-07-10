package application

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/rodrigo-militao/forge/internal/compose/domain"
)

type topicJSON struct {
	Topic             string `json:"topic"`
	ThemeArea         string `json:"theme_area"`
	Format            string `json:"format"`
	OneLinePitch      string `json:"one_line_pitch"`
	TargetLengthWords int    `json:"target_length_words"`
}

// ParseTopicJSON parses the LLM topic response into a Topic domain type.
func ParseTopicJSON(raw string) (*domain.Topic, error) {
	var tj topicJSON
	if err := json.Unmarshal([]byte(raw), &tj); err == nil && tj.Topic != "" {
		return mapTopic(tj)
	}
	start := strings.Index(raw, "{")
	end := strings.LastIndex(raw, "}")
	if start >= 0 && end > start {
		if err := json.Unmarshal([]byte(raw[start:end+1]), &tj); err == nil && tj.Topic != "" {
			return mapTopic(tj)
		}
	}
	return nil, fmt.Errorf("could not parse topic JSON from model output")
}

func mapTopic(tj topicJSON) (*domain.Topic, error) {
	if tj.TargetLengthWords <= 0 {
		tj.TargetLengthWords = 1500
	}
	return &domain.Topic{
		Topic:             tj.Topic,
		ThemeArea:         domain.ThemeArea(tj.ThemeArea),
		Format:            domain.Format(tj.Format),
		OneLinePitch:      tj.OneLinePitch,
		TargetLengthWords: tj.TargetLengthWords,
	}, nil
}

var _ = topicJSON{}
