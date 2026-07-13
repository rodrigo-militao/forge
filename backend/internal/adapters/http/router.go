package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/rodrigo-militao/forge/internal/adapters/events"
	"github.com/rodrigo-militao/forge/internal/core/application"
	"github.com/rodrigo-militao/forge/internal/core/ports"
	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

func NewRouter(users ports.UserRepository, usages ports.UsageCounterRepository, content ports.ContentRepository, jobs ports.JobRepository, interests digest.DigestInterestRepository, sources digest.SourceRepository, editions digest.EditionRepository, hub *events.Hub, plans *application.Plans, contentSvc *application.ContentService) http.Handler {
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

	authH := NewAuthHandler(users, usages)
	contentH := NewContentHandler(contentSvc)
	interestsH := NewInterestsHandler(interests, plans)
	sourcesH := NewSourcesHandler(sources, plans)

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

		r.Get("/api/content", contentH.List)
		r.Put("/api/content/{id}", contentH.Save)
		r.Delete("/api/content/{id}", contentH.Delete)
		r.Put("/api/content/{id}/category", contentH.UpdateCategory)
		r.Put("/api/content/{id}/status", contentH.UpdateStatus)
		r.Post("/api/content/{id}/tags", contentH.AddTag)
		r.Delete("/api/content/{id}/tags/{tag}", contentH.RemoveTag)
		r.Get("/api/content/tags", contentH.ListTags)

		r.Post("/api/digest/run", enqueueJob(jobs, usages, "curate_digest", false, plans))

		r.Get("/api/digest/article-newsletter-ids", func(w http.ResponseWriter, r *http.Request) {
			userID, ok := UserIDFromContext(r.Context())
			if !ok {
				writeError(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			ids, err := editions.ListArticleIDsInAnyNewsletter(r.Context(), userID)
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

		r.Post("/api/compose/generate-topic", enqueueJob(jobs, usages, "generate_topic", false, plans))
		r.Post("/api/compose/generate-draft", enqueueJob(jobs, usages, "compose_generate_draft", true, plans))
		r.Post("/api/compose/transform", enqueueJob(jobs, usages, "compose_transform", true, plans))
		r.Post("/api/compose/write", enqueueJob(jobs, usages, "compose_write", true, plans))

		editionH := NewEditionHandler(editions, jobs, usages, plans)
		r.Route("/api/editions", func(r chi.Router) {
			r.Get("/", editionH.List)
			r.Post("/", editionH.Create)
			r.Get("/{id}", editionH.GetByID)
			r.Put("/{id}/body", editionH.UpdateBody)
			r.Put("/{id}/status", editionH.UpdateStatus)
			r.Put("/{id}/category", editionH.UpdateCategory)
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

		r.Get("/api/events", NewEventsHandler(hub))
	})

	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	return r
}
