package http

import (
	"testing"

	"github.com/google/uuid"
	"github.com/rodrigo-militao/forge/internal/adapters/events"
	"github.com/rodrigo-militao/forge/internal/core/application"
)

func TestNewRouter(t *testing.T) {
	uid := uuid.New()
	r := NewRouter(RouterConfig{
		Users:       &mockUserRepo{},
		Usages:      &mockUsageRepo{},
		Content:     &mockContentRepo{},
		Jobs:        &mockHelpersJobRepo{},
		Interests:   &mockInterestRepo{},
		Sources:     &mockSourceRepo{},
		Editions:    &mockEditionRepo{},
		Hub:         &events.Hub{},
		Plans:       plansWithMaxGenerations(uid, 5),
		ContentSvc:  application.NewContentService(&mockContentRepo{}, &mockSourceLinker{}),
		Ideas:       &mockIdeaRepo{},
		SourceTrack: nil,
	})
	if r == nil {
		t.Fatal("expected non-nil router")
	}
}
