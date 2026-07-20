// Package wiring is the composition root for Forge.
// It constructs and wires all adapters and application services.
package wiring

import (
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rodrigo-militao/forge/internal/adapters/events"
	"github.com/rodrigo-militao/forge/internal/adapters/postgres"
	"github.com/rodrigo-militao/forge/internal/core/application"
	"github.com/rodrigo-militao/forge/internal/core/ports"
	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

// Container holds shared dependencies for both the API server and worker process.
// Prefer to add fields here rather than creating ad-hoc constructors in each entry point.
type Container struct {
	Pool        *pgxpool.Pool
	Users       ports.UserRepository
	Usages      ports.UsageCounterRepository
	Content     *postgres.ContentRepository
	Jobs        ports.JobRepository
	Interests   digest.DigestInterestRepository
	Sources     digest.SourceRepository
	Editions    digest.EditionRepository
	Ideas       ports.IdeaRepository
	SourceTrack application.SourceLinker
	Hub         *events.Hub
	Plans       *application.Plans
	References  *postgres.ReferenceRepository
	AIAnalyses  *postgres.AIAnalysisRepository
}

// BuildContainer constructs all shared dependencies from a database pool.
func BuildContainer(pool *pgxpool.Pool) *Container {
	return &Container{
		Pool:        pool,
		Users:       postgres.NewUserRepository(pool),
		Usages:      postgres.NewUsageCounterRepository(pool),
		Content:     postgres.NewContentRepository(pool),
		Jobs:        postgres.NewJobRepository(pool),
		Interests:   postgres.NewDigestInterestRepository(pool),
		Sources:     postgres.NewSourceRepository(pool),
		Editions:    postgres.NewEditionRepository(pool),
		Ideas:       postgres.NewIdeasRepository(postgres.New(pool)),
		SourceTrack: postgres.NewSourceTracking(pool),
		Hub:         events.NewHub(),
		Plans:       application.NewPlans(postgres.NewUserRepository(pool)),
		References:  postgres.NewReferenceRepository(pool),
		AIAnalyses:  postgres.NewAIAnalysisRepository(pool),
	}
}
