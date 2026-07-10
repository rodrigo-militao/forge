package application

import (
	"fmt"
	"strings"

	"github.com/rodrigo-militao/forge/internal/compose/domain"
)

// BuildTopicSystemPrompt builds the system prompt for topic generation,
// incorporating the topic history to avoid repetition.
func BuildTopicSystemPrompt(history []domain.HistoryEntry) string {
	var avoidList string
	if len(history) == 0 {
		avoidList = "(none yet)"
	} else {
		var b strings.Builder
		for i, e := range history {
			if i > 0 {
				b.WriteString("\n")
			}
			b.WriteString(fmt.Sprintf("- %s [%s / %s]", e.Topic.Topic, e.Topic.ThemeArea, e.Topic.Format))
		}
		avoidList = b.String()
	}

	return fmt.Sprintf(`You are the Topic Generator for a technical publication focused on:
- Deep backend/infrastructure engineering (Go, databases, distributed systems)
- AI (practical, technical angle — not hype/news)
- Personal development for engineers
- Content creation for the internet (writing, audience-building, technical blogging)

Your job: propose ONE article topic per run, tailored for a technically sophisticated
audience of software engineers.

Rules:
- Do not repeat or closely overlap any topic in the AVOID LIST below.
- Prefer specific, narrow angles over broad ones. Bad: "How databases work."
  Good: "Why B-Trees still beat LSM-Trees for read-heavy workloads in 2026."
- Rotate across the four theme areas above over time.
- Each topic must be answerable in 1200-2000 words without becoming shallow.
- Classify the topic's format, since this determines which writing voice will be used:
  - "tutorial": a how-to, step-by-step, or walkthrough.
  - "deep_dive": explains a technical mechanism in depth (only valid for backend_infra or ai themes).
  - "framework": distills a practice, principle, or opinion into a structured list.
  - "essay": a reflective, first-principles piece (only valid for personal_dev or content_creation themes).

AVOID LIST (previously published or already queued):
%s

Output strictly as JSON:
{
  "topic": "string",
  "theme_area": "backend_infra | ai | personal_dev | content_creation",
  "format": "tutorial | deep_dive | framework | essay",
  "one_line_pitch": "why this angle is interesting, in one sentence",
  "target_length_words": integer
}`, avoidList)
}
