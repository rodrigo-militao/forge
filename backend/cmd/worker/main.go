// Command worker is the async job processor for Forge (ADR 0026, ADR 0028).
package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/robfig/cron/v3"

	"github.com/rodrigo-militao/forge/internal/adapters/postgres"
	"github.com/rodrigo-militao/forge/internal/worker"
	"github.com/rodrigo-militao/forge/internal/wiring"
)

func main() {
	godotenv.Load() // optional — .env file next to the binary

	// Config from environment
	dbURL := env("DATABASE_URL", "postgres://forge:forge@localhost:5432/forge?sslmode=disable")
	llmAPIKey := env("LLM_API_KEY", "")
	llmBaseURL := env("LLM_BASE_URL", "https://code.verboo.ai/router/v1")
	pollInterval := env("POLL_INTERVAL", "10s")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Database pool
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	// Repositories
	jobs := postgres.NewJobRepository(pool)

	interval, err := time.ParseDuration(pollInterval)
	if err != nil {
		interval = 10 * time.Second
	}

	// Job runner
	runner := worker.NewRunner(jobs, interval)
	handlers := wiring.BuildWorkerHandlers(wiring.WorkerConfig{
		Pool:       pool,
		LLMAPIKey:  llmAPIKey,
		LLMBaseURL: llmBaseURL,
	})
	for jobType, fn := range handlers {
		runner.Register(jobType, fn)
	}

	// Cron scheduler for recurring jobs (ADR 0026)
	cr := cron.New()
	cr.AddFunc("0 7 * * *", func() {
		// Daily digest at 07:00
		slog.Info("scheduled: daily digest")
	})
	cr.Start()

	// Graceful shutdown
	go func() {
		sig := make(chan os.Signal, 1)
		signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
		<-sig
		slog.Info("shutting down worker")
		cr.Stop()
		cancel()
	}()

	slog.Info("worker starting", "poll_interval", interval)
	runner.Run(ctx)
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
