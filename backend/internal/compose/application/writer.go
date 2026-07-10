package application

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/compose/domain"
	coredomain "github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// WriterService generates complete articles via LLM using voice routing.
type WriterService struct {
	llm     ports.LLMClient
	content ports.ContentRepository
	userID  uuid.UUID
}

// NewWriterService creates a writer service.
func NewWriterService(llm ports.LLMClient, content ports.ContentRepository, userID uuid.UUID) *WriterService {
	return &WriterService{
		llm:     llm,
		content: content,
		userID:  userID,
	}
}

// GenerateParams is the input to article generation.
type GenerateParams struct {
	Topic             domain.Topic
	Voice             domain.Voice
	TargetLengthWords int
}

// WriteResult is the output of article generation.
type WriteResult struct {
	Article   domain.Article
	ContentID uuid.UUID
}

// Generate calls the LLM to write a complete article.
func (s *WriterService) Generate(ctx context.Context, params GenerateParams) (*WriteResult, error) {
	voiceProfile := domain.VoiceProfiles[params.Voice]
	if voiceProfile.Voice == "" {
		return nil, fmt.Errorf("unknown voice: %s", params.Voice)
	}

	tlw := params.TargetLengthWords
	if tlw <= 0 {
		tlw = 1500
	}

	systemPrompt := buildWriterSystemPrompt(params.Topic, voiceProfile.Instruction, tlw)
	resp, err := s.llm.Complete(ctx, ports.LLMRequest{
		SystemPrompt: systemPrompt,
		Messages:     []ports.LLMMessage{{Role: "user", Content: "Write the article now. Follow all the rules above strictly."}},
		MaxTokens:    4096,
		Temperature:  0.7,
	})
	if err != nil {
		return nil, fmt.Errorf("LLM article generation: %w", err)
	}

	article, err := parseArticleJSON(resp.Content)
	if err != nil {
		return nil, fmt.Errorf("parsing article: %w", err)
	}

	contentID := uuid.New()
	title := article.Title
	body := article.BodyMarkdown
	if err := s.content.Create(ctx, &coredomain.GeneratedContent{
		ID:           contentID,
		UserID:       s.userID,
		Product:      coredomain.ProductCompose,
		Status:       coredomain.ContentDraft,
		SourceType:   strPtrWriter("topic"),
		Title:        &title,
		BodyMarkdown: &body,
	}); err != nil {
		return nil, fmt.Errorf("persisting article: %w", err)
	}

	return &WriteResult{
		Article:   *article,
		ContentID: contentID,
	}, nil
}

// --- prompt building ---

func buildWriterSystemPrompt(topic domain.Topic, voiceInstruction string, targetWords int) string {
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

// --- JSON parsing ---

type articleJSON struct {
	Title        string `json:"title"`
	Subtitle     string `json:"subtitle"`
	BodyMarkdown string `json:"body_markdown"`
}

func parseArticleJSON(raw string) (*domain.Article, error) {
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

func strPtrWriter(s string) *string { return &s }

var _ = time.Now
