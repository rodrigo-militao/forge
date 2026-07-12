package http

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/rodrigo-militao/forge/internal/adapters/events"
	"github.com/rodrigo-militao/forge/internal/core/ports"
	digestApp "github.com/rodrigo-militao/forge/internal/digest/application"
	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

func NewRouter(users ports.UserRepository, usages ports.UsageCounterRepository, content ports.ContentRepository, jobs ports.JobRepository, interests digest.DigestInterestRepository, sources digest.SourceRepository, editions digest.EditionRepository, hub *events.Hub) http.Handler {
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
	contentH := NewContentHandler(content)
	interestsH := NewInterestsHandler(interests, users)
	sourcesH := NewSourcesHandler(sources, users)

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
		r.Post("/api/content/{id}/tags", contentH.AddTag)
		r.Delete("/api/content/{id}/tags/{tag}", contentH.RemoveTag)
		r.Get("/api/content/tags", contentH.ListTags)

		r.Post("/api/digest/run", enqueueJob(jobs, users, usages, "curate_digest", false))

		r.Post("/api/digest/assemble-edition", func(w http.ResponseWriter, r *http.Request) {
			userUUID, ok := UserIDFromContext(r.Context())
			if !ok {
				writeError(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			var req struct {
				ContentIDs []string `json:"content_ids"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				writeError(w, http.StatusBadRequest, "invalid body")
				return
			}
			svc := digestApp.NewEditionService(content, content, editions)
			result, err := svc.Assemble(r.Context(), userUUID.String(), req.ContentIDs...)
			if err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
			writeJSON(w, http.StatusOK, result)
		})

		r.Get("/api/digest/used-content-ids", func(w http.ResponseWriter, r *http.Request) {
			userID, ok := UserIDFromContext(r.Context())
			if !ok {
				writeError(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			ids, err := editions.ListUsedContentIDs(r.Context(), userID)
			if err != nil {
				writeError(w, http.StatusInternalServerError, "failed to list used content")
				return
			}
			strIDs := make([]string, len(ids))
			for i, id := range ids {
				strIDs[i] = id.String()
			}
			writeJSON(w, http.StatusOK, strIDs)
		})

		r.Post("/api/compose/generate-topic", enqueueJob(jobs, users, usages, "generate_topic", false))
		r.Post("/api/compose/generate-draft", enqueueJob(jobs, users, usages, "compose_generate_draft", true))
		r.Post("/api/compose/transform", enqueueJob(jobs, users, usages, "compose_transform", true))
		r.Post("/api/compose/write", enqueueJob(jobs, users, usages, "compose_write", true))

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
