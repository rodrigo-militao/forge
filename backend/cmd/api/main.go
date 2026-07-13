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
	"github.com/rodrigo-militao/forge/internal/adapters/events"
	"github.com/rodrigo-militao/forge/internal/adapters/postgres"
	"github.com/rodrigo-militao/forge/internal/core/application"
	digestApp "github.com/rodrigo-militao/forge/internal/digest/application"
)

func main() {
	godotenv.Load(".env")

	port := env("PORT", "8080")
	dbURL := env("DATABASE_URL", "postgres://forge:forge@localhost:5432/forge?sslmode=disable")

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	// Repositories
	users := postgres.NewUserRepository(pool)
	usages := postgres.NewUsageCounterRepository(pool)
	content := postgres.NewContentRepository(pool)
	jobs := postgres.NewJobRepository(pool)
	interests := postgres.NewDigestInterestRepository(pool)
	sources := postgres.NewSourceRepository(pool)
	editions := postgres.NewEditionRepository(pool)

	// SSE event hub (ADR 0031)
	hub := events.NewHub()
	defer hub.Close()

	// Start Postgres LISTEN goroutine for content_changed
	go func() {
		if err := events.ListenContentChanged(context.Background(), dbURL, hub); err != nil {
			slog.Error("events listener failed", "error", err)
		}
	}()

	// Edition service (wired once, shared with HTTP route)
	editionSvc := digestApp.NewEditionService(content, content, editions)

	// Router
	plans := application.NewPlans(users)
	router := handler.NewRouter(users, usages, content, jobs, interests, sources, editions, hub, editionSvc, plans)

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 0, // SSE connections are long-lived
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("server starting", "port", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down")
	cancel, cancelFn := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancelFn()

	if err := srv.Shutdown(cancel); err != nil {
		slog.Error("shutdown error", "error", err)
	}
}

func env(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return fallback
}
