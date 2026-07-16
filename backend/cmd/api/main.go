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
	"github.com/rodrigo-militao/forge/internal/core/application"
	"github.com/rodrigo-militao/forge/internal/wiring"
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

	// Shared container — holds all common dependencies
	c := wiring.BuildContainer(pool)
	defer c.Hub.Close()

	// InitJWT must be called before any authenticated requests
	handler.InitJWT(env("JWT_SECRET", "dev-secret"))

	// Start Postgres LISTEN goroutine for content_changed
	go func() {
		if err := events.ListenContentChanged(context.Background(), dbURL, c.Hub); err != nil {
			slog.Error("events listener failed", "error", err)
		}
	}()

	// Router
	contentSvc := application.NewContentService(c.Content, c.Content, c.Content, c.Content, c.SourceTrack)
	router := handler.NewRouter(handler.RouterConfig{
		Users:       c.Users,
		Usages:      c.Usages,
		Content:     c.Content,
		Jobs:        c.Jobs,
		Interests:   c.Interests,
		Sources:     c.Sources,
		Editions:    c.Editions,
		Hub:         c.Hub,
		Plans:       c.Plans,
		ContentSvc:  contentSvc,
		Ideas:       c.Ideas,
		SourceTrack: c.SourceTrack,
	})

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
