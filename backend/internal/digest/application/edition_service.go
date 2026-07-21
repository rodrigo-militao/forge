package application

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/rodrigo-militao/forge/internal/core/application"
	coredomain "github.com/rodrigo-militao/forge/internal/core/domain"
	"github.com/rodrigo-militao/forge/internal/core/ports"
	"github.com/rodrigo-militao/forge/internal/digest/domain"
)

// EditionService coordinates Edition use cases (ADR 0042, ADR 0046).
// Consistent with the ContentService pattern — ownership, lifecycle, and
// plan enforcement live here, not in the HTTP handler.
type EditionService struct {
	editions domain.EditionRepository
	jobs     ports.JobRepository
	usages   ports.UsageCounterRepository
	plans    *application.Plans
}

func NewEditionService(editions domain.EditionRepository, jobs ports.JobRepository, usages ports.UsageCounterRepository, plans *application.Plans) *EditionService {
	return &EditionService{editions: editions, jobs: jobs, usages: usages, plans: plans}
}

// requireOwnership fetches an edition and verifies the requesting user owns it.
func (s *EditionService) requireOwnership(ctx context.Context, id, userID uuid.UUID) (*domain.Edition, error) {
	return coredomain.RequireOwnership(ctx, func(ctx context.Context) (*domain.Edition, error) {
		return s.editions.GetByID(ctx, id)
	}, userID)
}

func (s *EditionService) List(ctx context.Context, userID uuid.UUID, status, category, tagID *string) ([]domain.Edition, error) {
	var editions []domain.Edition
	var err error

	if tagID != nil && *tagID != "" {
		all, listErr := s.editions.ListByUserFiltered(ctx, userID, status, category)
		if listErr != nil {
			return nil, listErr
		}
		tag := *tagID
		for _, e := range all {
			for _, t := range e.Tags {
				if t == tag {
					editions = append(editions, e)
					break
				}
			}
		}
	} else {
		editions, err = s.editions.ListByUserFiltered(ctx, userID, status, category)
		if err != nil {
			return nil, err
		}
	}
	return editions, nil
}

func (s *EditionService) ListArticleCounts(ctx context.Context, ids []uuid.UUID) (map[uuid.UUID]int, error) {
	return s.editions.ListArticleCounts(ctx, ids)
}

func (s *EditionService) GetByID(ctx context.Context, id, userID uuid.UUID) (*domain.Edition, error) {
	return s.requireOwnership(ctx, id, userID)
}

func (s *EditionService) Create(ctx context.Context, userID uuid.UUID, title string, category, destination *string) (*domain.Edition, error) {
	edition := &domain.Edition{
		UserID:      userID,
		Title:       title,
		Status:      domain.EditionBuilding,
		Destination: destination,
	}
	if category != nil && *category != "" {
		edition.Category = category
	}
	if err := s.editions.Create(ctx, edition); err != nil {
		return nil, fmt.Errorf("create edition: %w", err)
	}
	return edition, nil
}

func (s *EditionService) UpdateBody(ctx context.Context, id, userID uuid.UUID, title, body string) error {
	if _, err := s.requireOwnership(ctx, id, userID); err != nil {
		return err
	}
	return s.editions.UpdateBody(ctx, id, title, body)
}

func (s *EditionService) UpdateStatus(ctx context.Context, id, userID uuid.UUID, status domain.EditionStatus) error {
	edition, err := s.requireOwnership(ctx, id, userID)
	if err != nil {
		return err
	}
	if err := edition.Status.ValidateTransition(status); err != nil {
		return err
	}
	return s.editions.UpdateStatus(ctx, id, status)
}

func (s *EditionService) GenerateIntro(ctx context.Context, id, userID uuid.UUID) (*coredomain.Job, error) {
	if _, err := s.requireOwnership(ctx, id, userID); err != nil {
		return nil, err
	}
	if err := s.plans.CheckMonthGenerationQuota(ctx, userID, s.usages); err != nil {
		return nil, err
	}

	payload, _ := json.Marshal(map[string]string{"edition_id": id.String()})
	job := &coredomain.Job{
		UserID:  userID,
		Type:    "generate_edition_intro",
		Payload: payload,
	}
	if err := s.jobs.Create(ctx, job); err != nil {
		return nil, fmt.Errorf("enqueue intro: %w", err)
	}

	if _, incErr := s.usages.Increment(ctx, userID, ""); incErr != nil {
		slog.Warn("edition_service: usage counter increment failed", "error", incErr)
	}
	return job, nil
}

func (s *EditionService) Duplicate(ctx context.Context, id, userID uuid.UUID) (*domain.Edition, error) {
	if _, err := s.requireOwnership(ctx, id, userID); err != nil {
		return nil, err
	}
	return s.editions.Duplicate(ctx, id)
}

func (s *EditionService) AddTag(ctx context.Context, id, userID uuid.UUID, tag string) error {
	if _, err := s.requireOwnership(ctx, id, userID); err != nil {
		return err
	}
	return s.editions.AddTag(ctx, id, tag)
}

func (s *EditionService) RemoveTag(ctx context.Context, id, userID uuid.UUID, tag string) error {
	if _, err := s.requireOwnership(ctx, id, userID); err != nil {
		return err
	}
	return s.editions.RemoveTag(ctx, id, tag)
}

func (s *EditionService) UpdateCategory(ctx context.Context, id, userID uuid.UUID, category *string) error {
	if _, err := s.requireOwnership(ctx, id, userID); err != nil {
		return err
	}
	return s.editions.UpdateCategory(ctx, id, category)
}

func (s *EditionService) UpdateDestination(ctx context.Context, id, userID uuid.UUID, destination *string) error {
	if _, err := s.requireOwnership(ctx, id, userID); err != nil {
		return err
	}
	return s.editions.UpdateDestination(ctx, id, destination)
}

func (s *EditionService) AddArticle(ctx context.Context, id, userID uuid.UUID, contentID uuid.UUID) error {
	if _, err := s.requireOwnership(ctx, id, userID); err != nil {
		return err
	}
	return s.editions.AddArticle(ctx, id, contentID)
}

func (s *EditionService) RemoveArticle(ctx context.Context, id, userID uuid.UUID, contentID uuid.UUID) error {
	if _, err := s.requireOwnership(ctx, id, userID); err != nil {
		return err
	}
	return s.editions.RemoveArticle(ctx, id, contentID)
}

func (s *EditionService) ListArticles(ctx context.Context, id, userID uuid.UUID) ([]domain.ArticleRef, error) {
	if _, err := s.requireOwnership(ctx, id, userID); err != nil {
		return nil, err
	}
	return s.editions.ListArticles(ctx, id)
}

func (s *EditionService) ListDestinations(ctx context.Context, userID uuid.UUID) ([]string, error) {
	return s.editions.ListUsedDestinations(ctx, userID)
}
