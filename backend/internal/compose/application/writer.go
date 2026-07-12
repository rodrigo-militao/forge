package application

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/compose/domain"
	coredomain "github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// WriterService generates complete articles via LLM using voice routing.
type WriterService struct {
	llm     coredomain.LLMClient
	content ports.ContentWriter
	userID  uuid.UUID
}

// NewWriterService creates a writer service.
func NewWriterService(llm coredomain.LLMClient, content ports.ContentWriter, userID uuid.UUID) *WriterService {
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

	systemPrompt := BuildWriterSystemPrompt(params.Topic, voiceProfile.Instruction, tlw)
	resp, err := s.llm.Complete(ctx, coredomain.LLMRequest{
		SystemPrompt: systemPrompt,
		Messages:     []coredomain.LLMMessage{{Role: "user", Content: "Write the article now. Follow all the rules above strictly."}},
		MaxTokens:    4096,
		Temperature:  0.7,
	})
	if err != nil {
		return nil, fmt.Errorf("LLM article generation: %w", err)
	}

	article, err := ParseArticleJSON(resp.Content)
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

func strPtrWriter(s string) *string { return &s }
