package postgres

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rodrigo-militao/forge/internal/compose/domain"
)

// TopicRepository implements compose/domain.TopicRepository.
type TopicRepository struct {
	pool *pgxpool.Pool
	q    *Queries
}

func NewTopicRepository(pool *pgxpool.Pool) *TopicRepository {
	return &TopicRepository{pool: pool, q: New(pool)}
}

func (r *TopicRepository) ListByUser(ctx context.Context, userID uuid.UUID) ([]domain.Topic, error) {
	rows, err := r.q.ListTopicsByUser(ctx, uuidToPgtype(userID))
	if err != nil {
		return nil, err
	}
	result := make([]domain.Topic, len(rows))
	for i, row := range rows {
		result[i] = *topicFromModel(row)
	}
	return result, nil
}

func (r *TopicRepository) Create(ctx context.Context, topic *domain.Topic) error {
	row, err := r.q.CreateTopic(ctx, CreateTopicParams{
		UserID:       uuidToPgtype(topic.UserID),
		Topic:        topic.Topic,
		ThemeArea:    (*string)(&topic.ThemeArea),
		Format:       (*string)(&topic.Format),
		OneLinePitch: &topic.OneLinePitch,
	})
	if err != nil {
		return err
	}
	topic.ID = row.ID.Bytes
	topic.CreatedAt = row.CreatedAt.Time
	topic.UpdatedAt = row.UpdatedAt.Time
	return nil
}

func (r *TopicRepository) History(ctx context.Context, userID uuid.UUID, limit int) ([]domain.HistoryEntry, error) {
	rows, err := r.q.TopicHistory(ctx, TopicHistoryParams{
		UserID: uuidToPgtype(userID),
		Limit:  int32(limit),
	})
	if err != nil {
		return nil, err
	}
	result := make([]domain.HistoryEntry, len(rows))
	for i, row := range rows {
		t := topicFromModel(row)
		result[i] = domain.HistoryEntry{
			Topic:       *t,
			GeneratedAt: t.CreatedAt,
		}
	}
	return result, nil
}

func topicFromModel(t Topic) *domain.Topic {
	var themeArea domain.ThemeArea
	if t.ThemeArea != nil {
		themeArea = domain.ThemeArea(*t.ThemeArea)
	}
	var format domain.Format
	if t.Format != nil {
		format = domain.Format(*t.Format)
	}
	return &domain.Topic{
		ID:           t.ID.Bytes,
		UserID:       t.UserID.Bytes,
		Topic:        t.Topic,
		ThemeArea:    themeArea,
		Format:       format,
		OneLinePitch: deref(t.OneLinePitch),
		Enabled:      t.Enabled,
		CreatedAt:    t.CreatedAt.Time,
		UpdatedAt:    t.UpdatedAt.Time,
	}
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
