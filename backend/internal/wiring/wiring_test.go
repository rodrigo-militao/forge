package wiring

import (
	"context"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rodrigo-militao/forge/internal/core/application"
)

// TestContainerFields verifies that Container has the expected field types.
// This is a compile-time test — if the struct changes, this test breaks.
func TestContainerFields(t *testing.T) {
	// Creating a pool will try to connect, so use a throwaway local URL.
	// pgxpool.New doesn't block on connection — it creates the pool lazily.
	pool, err := pgxpool.New(context.Background(), "postgres://localhost:1/forge?sslmode=disable&connect_timeout=1")
	if err != nil {
		t.Skip("pool creation failed (expected without real DB):", err)
	}
	defer pool.Close()

	c := BuildContainer(pool)

	if c.Pool == nil {
		t.Error("Container.Pool should not be nil")
	}
	if c.Users == nil {
		t.Error("Container.Users should not be nil")
	}
	if c.Usages == nil {
		t.Error("Container.Usages should not be nil")
	}
	if c.Content == nil {
		t.Error("Container.Content should not be nil")
	}
	if c.Jobs == nil {
		t.Error("Container.Jobs should not be nil")
	}
	if c.Interests == nil {
		t.Error("Container.Interests should not be nil")
	}
	if c.Sources == nil {
		t.Error("Container.Sources should not be nil")
	}
	if c.Editions == nil {
		t.Error("Container.Editions should not be nil")
	}
	if c.Ideas == nil {
		t.Error("Container.Ideas should not be nil")
	}
	if c.SourceTrack == nil {
		t.Error("Container.SourceTrack should not be nil")
	}
	if c.Hub == nil {
		t.Error("Container.Hub should not be nil")
	}
	if c.Plans == nil {
		t.Error("Container.Plans should not be nil")
	}
}

// TestPlansImport verifies the application package is importable.
func TestPlansImport(t *testing.T) {
	_ = (*application.Plans)(nil)
}
