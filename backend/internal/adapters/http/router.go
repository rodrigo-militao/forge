package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/rodrigo-militao/forge/internal/core/application"
	"github.com/rodrigo-militao/forge/internal/core/ports"
	digestapp "github.com/rodrigo-militao/forge/internal/digest/application"
	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

// RouterConfig wires the HTTP router. Passed as a struct to avoid
// the 10-positional-parameter trap.
type RouterConfig struct {
	Users       ports.UserRepository
	Usages      ports.UsageCounterRepository
	Content     ports.ContentRepository
	Jobs        ports.JobRepository
	Interests   digest.DigestInterestRepository
	Sources     digest.SourceRepository
	Editions    digest.EditionRepository
	EditionSvc  *digestapp.EditionService
	Hub         ports.EventBus
	Plans       *application.Plans
	ContentSvc  *application.ContentService
	Ideas       ports.IdeaRepository
	SourceTrack application.SourceLinker
	References  ports.ReferenceRepository
	AISvc       *application.AIService
}

func NewRouter(cfg RouterConfig) http.Handler {
	r := chi.NewRouter()

	r.Use(chimw.RequestID)
	r.Use(RequestLogger)
	r.Use(chimw.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "https://forge.pages.dev"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	authH := NewAuthHandler(cfg.Users, cfg.Usages)
	contentH := NewContentHandler(cfg.ContentSvc, cfg.SourceTrack)
	digestH := NewDigestHandler(cfg.Content, cfg.Editions, cfg.Jobs)
	interestsH := NewInterestsHandler(cfg.Interests, cfg.Plans)
	sourcesH := NewSourcesHandler(cfg.Sources, cfg.Plans)
	ideasSvc := application.NewIdeasService(cfg.Ideas, cfg.Content)
	ideasH := NewIdeasHandler(ideasSvc)
	refSvc := application.NewReferenceService(cfg.References, cfg.Ideas, cfg.Content)
	refH := NewReferenceHandler(refSvc)
	aiH := NewAIHandler(cfg.AISvc)

	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/register", authH.Register)
		r.Post("/login", authH.Login)
	})

	r.Group(func(r chi.Router) {
		r.Use(AuthRequired)

		r.Post("/api/auth/logout", authH.Logout)
		r.Get("/api/auth/me", authH.Me)
		r.Put("/api/auth/restrict-search", authH.UpdateRestrictSearch)
		r.Put("/api/auth/theme", authH.UpdateThemePreference)

		r.Post("/api/content", contentH.Create)
		r.Get("/api/content", contentH.List)
		r.Get("/api/content/{id}", contentH.GetByID)
		r.Put("/api/content/{id}", contentH.Save)
		r.Delete("/api/content/{id}", contentH.Delete)
		r.Put("/api/content/{id}/categories", contentH.UpdateCategories)
		r.Post("/api/content/{id}/categories", contentH.AddCategory)
		r.Delete("/api/content/{id}/categories/{category}", contentH.RemoveCategory)
		r.Get("/api/content/categories", contentH.ListCategories)
		r.Put("/api/content/{id}/status", contentH.UpdateStatus)
		r.Put("/api/content/{id}/outline", contentH.UpdateOutline)
		r.Post("/api/content/{id}/tags", contentH.AddTag)
		r.Delete("/api/content/{id}/tags/{tag}", contentH.RemoveTag)
		r.Post("/api/content/{id}/link-source", contentH.LinkSource)
		r.Post("/api/content/{id}/transition", contentH.Transition)
		r.Get("/api/content/tags", contentH.ListTags)

		r.Mount("/api/ideas", ideasH.Routes())

		r.Post("/api/digest/run", EnqueueDigestJob(cfg.Jobs, cfg.Usages, cfg.Plans))
		r.Get("/api/digest/stats", digestH.GetStats)
		r.Get("/api/digest/jobs", digestH.ListJobs)
		r.Post("/api/digest/cancel", digestH.CancelJob)

		r.Get("/api/digest/article-newsletter-ids", func(w http.ResponseWriter, r *http.Request) {
			userID, ok := UserIDFromContext(r.Context())
			if !ok {
				writeError(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			ids, err := cfg.Editions.ListArticleIDsInAnyNewsletter(r.Context(), userID)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "failed to list article newsletter ids")
				return
			}
			strIDs := make([]string, len(ids))
			for i, id := range ids {
				strIDs[i] = id.String()
			}
			writeJSON(w, http.StatusOK, strIDs)
		})

		r.Post("/api/compose/generate-topic", enqueueJob(cfg.Jobs, cfg.Usages, "generate_topic", false, cfg.Plans))
		r.Post("/api/compose/generate-outline", enqueueJob(cfg.Jobs, cfg.Usages, "compose_generate_outline", true, cfg.Plans))
		r.Post("/api/compose/generate-draft", enqueueJob(cfg.Jobs, cfg.Usages, "compose_generate_draft", true, cfg.Plans))
		r.Post("/api/compose/transform", enqueueJob(cfg.Jobs, cfg.Usages, "compose_transform", true, cfg.Plans))
		r.Post("/api/compose/write", enqueueJob(cfg.Jobs, cfg.Usages, "compose_write", true, cfg.Plans))

		editionH := NewEditionHandler(cfg.EditionSvc)
		r.Route("/api/editions", func(r chi.Router) {
			r.Get("/", editionH.List)
			r.Post("/", editionH.Create)
			r.Get("/destinations", editionH.ListDestinations)
			r.Get("/{id}", editionH.GetByID)
			r.Put("/{id}/body", editionH.UpdateBody)
			r.Put("/{id}/status", editionH.UpdateStatus)
			r.Put("/{id}/category", editionH.UpdateCategory)
			r.Put("/{id}/destination", editionH.UpdateDestination)
			r.Post("/{id}/duplicate", editionH.Duplicate)
			r.Post("/{id}/tags/{tag}", editionH.AddTag)
			r.Delete("/{id}/tags/{tag}", editionH.RemoveTag)
			r.Post("/{id}/generate-intro", editionH.GenerateIntro)
			r.Get("/{id}/articles", editionH.ListArticles)
			r.Post("/{id}/articles", editionH.AddArticle)
			r.Delete("/{id}/articles/{contentID}", editionH.RemoveArticle)
		})

		r.Route("/api/digest/interests", func(r chi.Router) {
			r.Get("/", interestsH.List)
			r.Post("/", interestsH.Create)
			r.Put("/{id}", interestsH.UpdateEnabled)
			r.Delete("/{id}", interestsH.Delete)
		})

		r.Route("/api/digest/sources", func(r chi.Router) {
			r.Get("/", sourcesH.List)
			r.Post("/", sourcesH.Create)
			r.Put("/{id}", sourcesH.Update)
			r.Delete("/{id}", sourcesH.Delete)
		})

		homeH := NewHomeHandler(cfg.ContentSvc, cfg.Editions, cfg.Ideas)
		r.Get("/api/home/insights", homeH.Insights)

		r.Route("/api/references", func(r chi.Router) {
			r.Post("/", refH.Create)
			r.Get("/", refH.List)
			r.Get("/{id}", refH.GetByID)
			r.Put("/{id}", refH.Update)
			r.Delete("/{id}", refH.Delete)
		})

		r.Post("/api/ideas/{ideaID}/references/{referenceId}", refH.AttachToIdea)
		r.Get("/api/ideas/{ideaID}/references", refH.ListIdeaReferences)
		r.Delete("/api/ideas/{ideaID}/references/{referenceId}", refH.DetachFromIdea)

		r.Post("/api/content/{id}/references/{referenceId}", refH.AttachToContent)
		r.Get("/api/content/{id}/references", refH.ListContentReferences)
		r.Delete("/api/content/{id}/references/{referenceId}", refH.DetachFromContent)

		r.Post("/api/content/{id}/ai/analyze", aiH.Analyze)
		r.Get("/api/content/{id}/ai/analysis", aiH.GetAnalysis)
		r.Post("/api/content/{id}/ai/improve", aiH.ImproveText)

		r.Get("/api/events", NewEventsHandler(cfg.Hub))
	})

	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	return r
}
