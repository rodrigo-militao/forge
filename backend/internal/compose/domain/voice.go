package domain

import "fmt"

// Voice is a writing style profile.
type Voice string

const (
	VoiceConfessional   Voice = "confessional"
	VoiceCleanTechnical Voice = "clean_technical"
	VoiceFramework      Voice = "framework"
	VoiceEssay          Voice = "essay"
)

// VoiceProfile holds the system-prompt instruction block for a voice.
type VoiceProfile struct {
	Voice       Voice
	Instruction string
}

// VoiceProfiles maps voice constants to their instruction blocks.
var VoiceProfiles = map[Voice]VoiceProfile{
	VoiceConfessional: {
		Voice: VoiceConfessional,
		Instruction: `VOICE: Confessional, first-person.
- Open with a direct question or a mild provocation that challenges the reader's
  assumption about the topic.
- Write as if explaining to a friend who is smart but new to this. Use "I" often:
  "I spent a long time confused about X", "I use this all the time".
- Light, self-deprecating humor is welcome. Parenthetical asides are welcome.
- Authority comes from lived experience, not citations — do not cite external
  sources/studies in this voice.
- Break the "professional blog" tone on purpose: short paragraphs, occasional
  rhetorical questions to the reader.
- Close with a short, informal sign-off — not a generic "let me know your thoughts".`,
	},
	VoiceCleanTechnical: {
		Voice: VoiceCleanTechnical,
		Instruction: `VOICE: Clean technical explainer, third person, reference-style.
- Structure in numbered sections. Each section: define the mechanism → explain
  how it works → list concrete benefits and trade-offs.
- Precision matters more than personality here — this should read like something
  a reader bookmarks and comes back to.
- Light humor is acceptable, but rare — at most once in the whole piece.
- Ground claims in named, specific mechanisms (e.g. exact terms like MVCC, xmin,
  WAL) rather than hand-wavy descriptions.
- Close with a short, quotable one-line takeaway — near-aphoristic, not salesy.`,
	},
	VoiceFramework: {
		Voice: VoiceFramework,
		Instruction: `VOICE: Structured practitioner framework, third person with occasional first-person
anchoring.
- Present the content as a numbered list of principles/laws/practices, each with:
  a short name, a one-paragraph explanation, and one concrete, named example
  (a real-sounding company, incident, or project — generic/hypothetical is fine,
  but present it as a specific case, not an abstraction).
- Use emoji as bullet markers sparingly within lists (not in every paragraph).
- Use first person only to anchor a specific personal experience ("I once worked
  on a team where..."), not as the default voice.
- Close by tying the principles together with a short reflection, not a sales pitch.`,
	},
	VoiceEssay: {
		Voice: VoiceEssay,
		Instruction: `VOICE: Reflective essay/manifesto, first person.
- Short, isolated sentences forming their own paragraphs — deliberate rhythm,
  almost poetic pacing. Avoid long, complex sentences.
- No external citations, no named studies — the authority is the writer's own
  synthesized conviction.
- Generalize personal/observed experience into a universal principle the reader
  can apply to themselves.
- Do not use numbered lists or technical headers — this voice flows as continuous
  narrative/reflection.
- Close with a short, direct call to the reader's own agency (not a product pitch).`,
	},
}

// SelectVoice returns the voice for a given theme_area and format
// according to the deterministic routing table.
func SelectVoice(themeArea ThemeArea, format Format) (Voice, error) {
	switch format {
	case FormatTutorial:
		return VoiceConfessional, nil
	case FormatDeepDive:
		if themeArea == ThemeBackendInfra || themeArea == ThemeAI {
			return VoiceCleanTechnical, nil
		}
	case FormatFramework:
		if themeArea == ThemeBackendInfra || themeArea == ThemeAI || themeArea == ThemeContentCreation {
			return VoiceFramework, nil
		}
	case FormatEssay:
		if themeArea == ThemePersonalDev || themeArea == ThemeContentCreation {
			return VoiceEssay, nil
		}
	}
	return "", fmt.Errorf("no voice matches combination: theme_area=%q format=%q", themeArea, format)
}
