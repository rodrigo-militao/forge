//go:build integration

package postgres

import (
	"context"
	"encoding/json"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"

	digest "github.com/rodrigo-militao/forge/internal/digest/domain"
)

// setupIntegrationDB starts a Postgres container, runs all migrations, and
// returns a pool connected to the test database plus a cleanup function.
func setupIntegrationDB(t *testing.T) (*pgxpool.Pool, func()) {
	t.Helper()
	ctx := context.Background()

	pgContainer, err := postgres.Run(ctx,
		"postgres:16-alpine",
		postgres.WithDatabase("forge_test"),
		postgres.WithUsername("forge"),
		postgres.WithPassword("forge"),
		testcontainers.WithWaitStrategyAndDeadline(
			2*time.Minute,
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
				WithStartupTimeout(30*time.Second),
		),
	)
	if err != nil {
		t.Fatalf("failed to start postgres container: %v", err)
	}

	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("failed to get connection string: %v", err)
	}

	pool, err := pgxpool.New(ctx, connStr)
	if err != nil {
		t.Fatalf("failed to create pool: %v", err)
	}

	// Run all up migrations in order.
	// Try common migration directory paths relative to the test file location.
	migrationDir := findMigrationDir(t)
	if migrationDir == "" {
		t.Fatal("migrations directory not found")
	}

	entries, err := os.ReadDir(migrationDir)
	if err != nil {
		t.Fatalf("failed to read migration dir %s: %v", migrationDir, err)
	}

	// Collect and sort .up.sql files alphabetically (migration order).
	var upFiles []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".up.sql") {
			upFiles = append(upFiles, e.Name())
		}
	}
	sort.Strings(upFiles)

	for _, f := range upFiles {
		sql, err := os.ReadFile(filepath.Join(migrationDir, f))
		if err != nil {
			t.Fatalf("failed to read migration %s: %v", f, err)
		}
		if _, err := pool.Exec(ctx, string(sql)); err != nil {
			t.Fatalf("failed to execute migration %s: %v", f, err)
		}
	}

	cleanup := func() {
		pool.Close()
		_ = pgContainer.Terminate(ctx)
	}

	return pool, cleanup
}

func findMigrationDir(t *testing.T) string {
	t.Helper()
	// Candidates relative to the test file at internal/adapters/postgres/.
	candidates := []string{
		"../../../migrations",
		"../../../../migrations",
	}
	for _, c := range candidates {
		abs := filepath.Clean(c)
		if info, err := os.Stat(abs); err == nil && info.IsDir() {
			return abs
		}
	}
	return ""
}

// createTestUser inserts a minimal user row and returns its UUID.
func createTestUser(ctx context.Context, t *testing.T, pool *pgxpool.Pool) uuid.UUID {
	t.Helper()
	uid := uuid.New()
	email := "test-" + uid.String()[:8] + "@example.com"
	_, err := pool.Exec(ctx,
		`INSERT INTO users (id, email, password_hash, name) VALUES ($1, $2, $3, $4)`,
		uid, email, "hash", "Test User",
	)
	if err != nil {
		t.Fatalf("failed to create test user: %v", err)
	}
	return uid
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

func TestSourceRepository_CreateAndList(t *testing.T) {
	pool, cleanup := setupIntegrationDB(t)
	defer cleanup()
	ctx := context.Background()

	userID := createTestUser(ctx, t, pool)
	repo := NewSourceRepository(pool)

	// Create an RSS source.
	src, err := repo.Create(ctx, userID, "My RSS Feed", digest.SourceTypeRSS, json.RawMessage(`{"url":"https://example.com/feed.xml"}`))
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if src.Name != "My RSS Feed" {
		t.Errorf("expected name 'My RSS Feed', got '%s'", src.Name)
	}
	if src.Type != digest.SourceTypeRSS {
		t.Errorf("expected type 'rss', got '%s'", src.Type)
	}
	if !src.Enabled {
		t.Error("expected new source to be enabled")
	}

	// List by user — should include the created source.
	list, err := repo.ListByUser(ctx, userID)
	if err != nil {
		t.Fatalf("ListByUser: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 source, got %d", len(list))
	}
	if list[0].ID != src.ID {
		t.Errorf("expected source ID %v, got %v", src.ID, list[0].ID)
	}
}

func TestSourceRepository_ListByUser_respectsUserScope(t *testing.T) {
	pool, cleanup := setupIntegrationDB(t)
	defer cleanup()
	ctx := context.Background()

	userA := createTestUser(ctx, t, pool)
	userB := createTestUser(ctx, t, pool)
	repo := NewSourceRepository(pool)

	// Create one source for userA.
	_, err := repo.Create(ctx, userA, "User A Feed", digest.SourceTypeRSS, json.RawMessage(`{"url":"https://a.example.com"}`))
	if err != nil {
		t.Fatalf("Create for userA: %v", err)
	}
	// Create one source for userB.
	_, err = repo.Create(ctx, userB, "User B Feed", digest.SourceTypeRSS, json.RawMessage(`{"url":"https://b.example.com"}`))
	if err != nil {
		t.Fatalf("Create for userB: %v", err)
	}

	// userA should see exactly their own source.
	listA, err := repo.ListByUser(ctx, userA)
	if err != nil {
		t.Fatalf("ListByUser userA: %v", err)
	}
	if len(listA) != 1 {
		t.Fatalf("expected 1 source for userA, got %d", len(listA))
	}
	if listA[0].Name != "User A Feed" {
		t.Errorf("expected 'User A Feed', got '%s'", listA[0].Name)
	}

	// userB should see exactly their own source.
	listB, err := repo.ListByUser(ctx, userB)
	if err != nil {
		t.Fatalf("ListByUser userB: %v", err)
	}
	if len(listB) != 1 {
		t.Fatalf("expected 1 source for userB, got %d", len(listB))
	}
	if listB[0].Name != "User B Feed" {
		t.Errorf("expected 'User B Feed', got '%s'", listB[0].Name)
	}
}

func TestSourceRepository_Delete(t *testing.T) {
	pool, cleanup := setupIntegrationDB(t)
	defer cleanup()
	ctx := context.Background()

	userID := createTestUser(ctx, t, pool)
	repo := NewSourceRepository(pool)

	src, err := repo.Create(ctx, userID, "To Delete", digest.SourceTypeRSS, nil)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	// Delete the source.
	if err := repo.Delete(ctx, src.ID, userID); err != nil {
		t.Fatalf("Delete: %v", err)
	}

	// Verify it's gone.
	list, err := repo.ListByUser(ctx, userID)
	if err != nil {
		t.Fatalf("ListByUser after delete: %v", err)
	}
	if len(list) != 0 {
		t.Errorf("expected 0 sources after delete, got %d", len(list))
	}
}

func TestSourceRepository_Delete_wrongUser(t *testing.T) {
	pool, cleanup := setupIntegrationDB(t)
	defer cleanup()
	ctx := context.Background()

	ownerID := createTestUser(ctx, t, pool)
	otherID := createTestUser(ctx, t, pool)
	repo := NewSourceRepository(pool)

	src, err := repo.Create(ctx, ownerID, "Owned", digest.SourceTypeRSS, nil)
	if err != nil {
		t.Fatalf("Create: %v", err)
	}

	// Other user tries to delete — should be a no-op (DELETE matches id AND user_id).
	if err := repo.Delete(ctx, src.ID, otherID); err != nil {
		t.Fatalf("Delete by wrong user should not error: %v", err)
	}

	// Source should still exist for the owner.
	list, err := repo.ListByUser(ctx, ownerID)
	if err != nil {
		t.Fatalf("ListByUser: %v", err)
	}
	if len(list) != 1 {
		t.Errorf("expected 1 source still, got %d", len(list))
	}
}

func TestSourceRepository_Create_webSearchType(t *testing.T) {
	pool, cleanup := setupIntegrationDB(t)
	defer cleanup()
	ctx := context.Background()

	userID := createTestUser(ctx, t, pool)
	repo := NewSourceRepository(pool)

	src, err := repo.Create(ctx, userID, "Web Search", digest.SourceTypeWebSearch, json.RawMessage(`{"query":"golang testing"}`))
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if src.Type != digest.SourceTypeWebSearch {
		t.Errorf("expected type 'web_search', got '%s'", src.Type)
	}
}
