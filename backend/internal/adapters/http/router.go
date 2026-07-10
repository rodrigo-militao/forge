package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"

	"github.com/rodrigo-militao/forge/internal/core/ports"
)

// NewRouter creates the chi router with all routes and middleware.
func NewRouter(users ports.UserRepository, content ports.ContentRepository, jobs ports.JobRepository) http.Handler {
	r := chi.NewRouter()

	// Global middleware
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

	// Handlers
	authH := NewAuthHandler(users)
	contentH := NewContentHandler(content)
	digestH := NewDigestHandler(jobs)
	composeH := NewComposeHandler(jobs)
	editionH := NewEditionHandler(jobs)

	// Public routes
	r.Route("/api/auth", func(r chi.Router) {
		r.Post("/register", authH.Register)
		r.Post("/login", authH.Login)
	})

	// Authenticated routes
	r.Group(func(r chi.Router) {
		r.Use(AuthRequired)

		r.Post("/api/auth/logout", authH.Logout)
		r.Get("/api/auth/me", authH.Me)

		r.Get("/api/content", contentH.List)
		r.Post("/api/content/{id}/approve", contentH.Approve)
		r.Post("/api/content/{id}/reject", contentH.Reject)

		r.Post("/api/digest/run", digestH.Run)
		r.Post("/api/digest/assemble-edition", editionH.Assemble)

		r.Post("/api/compose/generate-topic", composeH.GenerateTopic)
		r.Post("/api/compose/generate-draft", composeH.GenerateDraft)
		r.Post("/api/compose/transform", composeH.Transform)
		r.Post("/api/compose/write", composeH.WriteArticle)
	})

	// Health check
	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	return r
}
