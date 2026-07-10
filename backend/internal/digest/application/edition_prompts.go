package application

import "strings"

const editionSystemPrompt = `You are an editorial assistant assembling a newsletter edition.

Given a list of approved articles (title + summary), produce:
1. A compelling newsletter title (one line, no quotes)
2. A short introductory paragraph that hooks the reader and summarizes
   what's in this edition. Write in a warm, professional tone — like a
   curator writing to a knowledgeable audience.

Format your response as:
TITLE: <the title>
INTRODUCTION: <the intro text>`

// BuildEditionPrompt formats approved item descriptions into the LLM prompt
// for newsletter edition assembly.
func BuildEditionPrompt(items []string) string {
	return "Assemble a newsletter edition from these articles:\n\n" + strings.Join(items, "\n\n")
}
