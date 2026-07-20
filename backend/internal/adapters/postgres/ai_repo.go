package postgres

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rodrigo-militao/forge/internal/core/domain"
)

// AIAnalysisRepository persists AI analysis results using sqlc-generated queries.
type AIAnalysisRepository struct {
	pool *pgxpool.Pool
	q    *Queries
}

func NewAIAnalysisRepository(pool *pgxpool.Pool) *AIAnalysisRepository {
	return &AIAnalysisRepository{pool: pool, q: New(pool)}
}

func (r *AIAnalysisRepository) Create(ctx context.Context, analysis *domain.AIAnalysis) error {
	strengths, err := json.Marshal(analysis.Strengths)
	if err != nil {
		return err
	}
	improvements, err := json.Marshal(analysis.Improvements)
	if err != nil {
		return err
	}
	created, err := r.q.CreateAIAnalysis(ctx, CreateAIAnalysisParams{
		UserID:       uuidToPgtype(analysis.UserID),
		ContentID:    uuidToPgtype(analysis.ContentID),
		Summary:      analysis.Summary,
		Strengths:    strengths,
		Improvements: improvements,
		Score:        int32(analysis.Score),
	})
	if err != nil {
		return err
	}
	*analysis = *aiAnalysisFromModel(created)
	return nil
}

func (r *AIAnalysisRepository) GetLatestByContentID(ctx context.Context, contentID, userID uuid.UUID) (*domain.AIAnalysis, error) {
	row, err := r.q.GetLatestAnalysisByContent(ctx, GetLatestAnalysisByContentParams{
		ContentID: uuidToPgtype(contentID),
		UserID:    uuidToPgtype(userID),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, err
	}
	return aiAnalysisFromModel(row), nil
}

func aiAnalysisFromModel(a AiAnalysis) *domain.AIAnalysis {
	result := &domain.AIAnalysis{
		ID:        a.ID.Bytes,
		UserID:    a.UserID.Bytes,
		ContentID: a.ContentID.Bytes,
		Summary:   a.Summary,
		Score:     int(a.Score),
		CreatedAt: a.CreatedAt.Time,
		UpdatedAt: a.UpdatedAt.Time,
	}
	if len(a.Strengths) > 0 {
		json.Unmarshal(a.Strengths, &result.Strengths)
	}
	if len(a.Improvements) > 0 {
		json.Unmarshal(a.Improvements, &result.Improvements)
	}
	return result
}
