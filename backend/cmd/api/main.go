// Command api is the HTTP server entry point for Forge.
package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"

	handler "github.com/rodrigo-militao/forge/internal/adapters/http"
	"github.com/rodrigo-militao/forge/internal/adapters/postgres"
)

func main() {
	godotenv.Load() // optional — .env file next to the binary

	// Config from environment
	port := env("PORT", "8080")
	dbURL := env("DATABASE_URL", "postgres://forge:forge@localhost:5432/forge?sslmode=disable")
	jwtSecret := env("JWT_SECRET", "dev-secret-do-not-use-in-production")

	handler.InitJWT(jwtSecret)

	// Database pool
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	// Repositories
	users := postgres.NewUserRepository(pool)
	content := postgres.NewContentRepository(pool)
	jobs := postgres.NewJobRepository(pool)

	// Router
	router := handler.NewRouter(users, content, jobs)

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
		<-sig

		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		slog.Info("shutting down server")
		srv.Shutdown(shutdownCtx)
	}()

	slog.Info("server starting", "port", port)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("server error", "error", err)
		os.Exit(1)
	}
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
