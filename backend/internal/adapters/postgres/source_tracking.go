package postgres

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// SourceTracking handles the source_digest_article_id column
// that links compose articles and ideas back to their originating digest article.
// This is separate from the sqlc-generated code to avoid breaking existing queries.
type SourceTracking struct {
	pool *pgxpool.Pool
}

func NewSourceTracking(pool *pgxpool.Pool) *SourceTracking {
	return &SourceTracking{pool: pool}
}

// SetContentSource sets the source_digest_article_id on a generated_content row.
func (s *SourceTracking) SetContentSource(ctx context.Context, contentID, sourceID uuid.UUID) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE generated_content SET source_digest_article_id = $1 WHERE id = $2`,
		sourceID, contentID)
	return err
}

// SetIdeaSource sets the source_digest_article_id on an ideas row.
func (s *SourceTracking) SetIdeaSource(ctx context.Context, ideaID, sourceID uuid.UUID) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE ideas SET source_digest_article_id = $1 WHERE id = $2`,
		sourceID, ideaID)
	return err
}
