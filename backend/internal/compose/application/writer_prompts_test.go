package application

import (
	"strings"
	"testing"

	"github.com/rodrigo-militao/forge/internal/compose/domain"
)

func TestBuildWriterSystemPrompt(t *testing.T) {
	t.Run("all fields populated without outline", func(t *testing.T) {
		topic := domain.Topic{
			Topic:             "Go Generics in Practice",
			OneLinePitch:      "Learn how to use Go generics effectively",
			ThemeArea:         domain.ThemeBackendInfra,
			Format:            domain.FormatTutorial,
			TargetLengthWords: 1500,
		}
		voiceProfile := domain.VoiceProfiles[domain.VoiceConfessional]
		prompt := BuildWriterSystemPrompt(topic, voiceProfile.Instruction, 1500, "")

		if prompt == "" {
			t.Fatal("expected non-empty prompt")
		}
		if !strings.Contains(prompt, "Go Generics in Practice") {
			t.Error("expected prompt to contain topic")
		}
		if !strings.Contains(prompt, "Learn how to use Go generics effectively") {
			t.Error("expected prompt to contain one_line_pitch")
		}
		if !strings.Contains(prompt, string(domain.ThemeBackendInfra)) {
			t.Error("expected prompt to contain theme area")
		}
		if !strings.Contains(prompt, string(domain.FormatTutorial)) {
			t.Error("expected prompt to contain format")
		}
		if !strings.Contains(prompt, "1500 words") {
			t.Error("expected prompt to contain target word count")
		}
	})

	t.Run("with outline appended", func(t *testing.T) {
		topic := domain.Topic{
			Topic:             "Rust vs Go",
			OneLinePitch:      "Comparing two systems languages",
			ThemeArea:         domain.ThemeBackendInfra,
			Format:            domain.FormatFramework,
			TargetLengthWords: 2000,
		}
		voiceProfile := domain.VoiceProfiles[domain.VoiceFramework]
		outline := "# Rust vs Go\n\n## Performance\n- Benchmark comparison\n- Memory usage\n"
		prompt := BuildWriterSystemPrompt(topic, voiceProfile.Instruction, 2000, outline)

		if !strings.Contains(prompt, "OUTLINE TO FOLLOW") {
			t.Error("expected prompt to contain 'OUTLINE TO FOLLOW' when outline is provided")
		}
		if !strings.Contains(prompt, outline) {
			t.Error("expected prompt to contain the full outline text")
		}
	})

	t.Run("empty outline does not append outline section", func(t *testing.T) {
		topic := domain.Topic{
			Topic:             "AI for Engineers",
			OneLinePitch:      "Practical AI applications",
			ThemeArea:         domain.ThemeAI,
			Format:            domain.FormatDeepDive,
			TargetLengthWords: 1800,
		}
		voiceProfile := domain.VoiceProfiles[domain.VoiceCleanTechnical]
		prompt := BuildWriterSystemPrompt(topic, voiceProfile.Instruction, 1800, "")

		if strings.Contains(prompt, "OUTLINE TO FOLLOW") {
			t.Error("expected NO outline section when outline is empty")
		}
	})

	t.Run("zero target words still shows 0", func(t *testing.T) {
		topic := domain.Topic{
			Topic:        "Zero Words",
			OneLinePitch: "Test",
			ThemeArea:    domain.ThemePersonalDev,
			Format:       domain.FormatEssay,
		}
		voiceProfile := domain.VoiceProfiles[domain.VoiceEssay]
		prompt := BuildWriterSystemPrompt(topic, voiceProfile.Instruction, 0, "")

		if !strings.Contains(prompt, "0 words") {
			t.Error("expected prompt to show '0 words' when target is 0")
		}
	})

	t.Run("all template placeholders are replaced", func(t *testing.T) {
		topic := domain.Topic{
			Topic:             "Template Test",
			OneLinePitch:      "Testing template replacement",
			ThemeArea:         domain.ThemeContentCreation,
			Format:            domain.FormatFramework,
			TargetLengthWords: 1200,
		}
		voiceProfile := domain.VoiceProfiles[domain.VoiceFramework]
		prompt := BuildWriterSystemPrompt(topic, voiceProfile.Instruction, 1200, "")

		unreplaced := []string{"{{TOPIC}}", "{{ONE_LINE_PITCH}}", "{{THEME_AREA}}", "{{FORMAT}}", "{{TARGET_LENGTH_WORDS}}", "{{VOICE_PROFILE_BLOCK}}"}
		for _, placeholder := range unreplaced {
			if strings.Contains(prompt, placeholder) {
				t.Errorf("placeholder '%s' was not replaced in the prompt", placeholder)
			}
		}
	})

	t.Run("contains voice instruction text", func(t *testing.T) {
		topic := domain.Topic{
			Topic:             "Voice Test",
			OneLinePitch:      "Testing voice routing",
			ThemeArea:         domain.ThemePersonalDev,
			Format:            domain.FormatEssay,
			TargetLengthWords: 1000,
		}
		voiceProfile := domain.VoiceProfiles[domain.VoiceEssay]
		prompt := BuildWriterSystemPrompt(topic, voiceProfile.Instruction, 1000, "")

		if !strings.Contains(prompt, "Reflective essay/manifesto") {
			t.Error("expected prompt to contain essay voice description")
		}
	})

	t.Run("produces valid markdown output instruction", func(t *testing.T) {
		topic := domain.Topic{
			Topic:             "Markdown Test",
			OneLinePitch:      "Testing markdown output",
			ThemeArea:         domain.ThemeBackendInfra,
			Format:            domain.FormatTutorial,
			TargetLengthWords: 1500,
		}
		voiceProfile := domain.VoiceProfiles[domain.VoiceConfessional]
		prompt := BuildWriterSystemPrompt(topic, voiceProfile.Instruction, 1500, "")

		if !strings.Contains(prompt, "Output strictly as JSON") {
			t.Error("expected prompt to contain JSON output instruction")
		}
		if !strings.Contains(prompt, "body_markdown") {
			t.Error("expected prompt to mention body_markdown in JSON schema")
		}
	})
}
