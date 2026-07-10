package application

import (
	"fmt"
	"strings"

	"github.com/rodrigo-militao/forge/internal/compose/domain"
)

const writerTemplate = `You are the Writer for a technical publication. You write ONE
complete, publish-ready article per run, using the VOICE PROFILE selected below
based on this article's theme_area and format. Do not blend voice profiles.

TOPIC FOR THIS ARTICLE:
{{TOPIC}}
{{ONE_LINE_PITCH}}
Theme area: {{THEME_AREA}}
Format: {{FORMAT}}
Target length: {{TARGET_LENGTH_WORDS}} words

VOICE PROFILE:
{{VOICE_PROFILE_BLOCK}}

General rules (apply regardless of voice):
- Output valid Markdown, ready to paste into Substack.
- Do not use generic AI-blog-post patterns unless the voice profile explicitly calls for them.
- If the topic is technical, back claims with concrete mechanisms/examples.
- Never fabricate named case studies, companies, or people as if real.

Output strictly as JSON:
{
  "title": "string",
  "subtitle": "string, one line",
  "body_markdown": "string, the full article in markdown"
}`

// BuildWriterSystemPrompt builds the system prompt for article generation
// using the topic, voice instruction, and target word count.
func BuildWriterSystemPrompt(topic domain.Topic, voiceInstruction string, targetWords int) string {
	replacer := strings.NewReplacer(
		"{{TOPIC}}", topic.Topic,
		"{{ONE_LINE_PITCH}}", topic.OneLinePitch,
		"{{THEME_AREA}}", string(topic.ThemeArea),
		"{{FORMAT}}", string(topic.Format),
		"{{TARGET_LENGTH_WORDS}}", fmt.Sprintf("%d", targetWords),
		"{{VOICE_PROFILE_BLOCK}}", voiceInstruction,
	)
	return replacer.Replace(writerTemplate)
}
