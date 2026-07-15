package application

const outlineTemplate = `You are an article outline generator for a technical publication.
Generate a structured outline for an article based on the given topic.

The outline should be a clear, logical structure with:
- A compelling title
- 3-6 main sections with brief descriptions of what each section covers
- Suggested key points under each section

Output strictly as JSON:
{
  "title": "string, the article title",
  "sections": [
    {
      "heading": "string, section heading",
      "points": ["string, key point to cover"]
    }
  ]
}`

// BuildOutlineSystemPrompt returns the system prompt for outline generation.
func BuildOutlineSystemPrompt() string {
	return outlineTemplate
}
