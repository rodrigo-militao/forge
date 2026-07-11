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

func NewRouter(users ports.UserRepository, content ports.ContentRepository, jobs ports.JobRepository, interests digest.DigestInterestRepository, sources digest.SourceRepository, editions digest.EditionRepository, hub *events.Hub) http.Handler {
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

	authH := NewAuthHandler(users)
	contentH := NewContentHandler(content)
	interestsH := NewInterestsHandler(interests)
	sourcesH := NewSourcesHandler(sources)

	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/register", authH.Register)
		r.Post("/login", authH.Login)
	})

	r.Group(func(r chi.Router) {
		r.Use(AuthRequired)

		r.Post("/api/auth/logout", authH.Logout)
		r.Get("/api/auth/me", authH.Me)

		r.Get("/api/content", contentH.List)
		r.Put("/api/content/{id}", contentH.Save)
		r.Post("/api/content/{id}/approve", contentH.Approve)
		r.Post("/api/content/{id}/reject", contentH.Reject)

		r.Post("/api/digest/run", enqueueJob(jobs, "curate_digest", false))

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
			svc := digestApp.NewEditionService(content, editions)
			result, err := svc.Assemble(r.Context(), userUUID.String(), req.ContentIDs...)
			if err != nil {
				writeError(w, http.StatusInternalServerError, err.Error())
				return
			}
			writeJSON(w, http.StatusOK, result)
		})

		r.Post("/api/compose/generate-topic", enqueueJob(jobs, "generate_topic", false))
		r.Post("/api/compose/generate-draft", enqueueJob(jobs, "compose_generate_draft", true))
		r.Post("/api/compose/transform", enqueueJob(jobs, "compose_transform", true))
		r.Post("/api/compose/write", enqueueJob(jobs, "compose_write", true))

		r.Route("/api/digest/interests", func(r chi.Router) {
			r.Get("/", interestsH.List)
			r.Post("/", interestsH.Create)
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
