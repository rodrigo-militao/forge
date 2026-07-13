.PHONY: all setup db migrate api worker frontend dev run run-dev test test-backend test-frontend test-all coverage coverage-backend coverage-frontend lint build clean up restart restart-backend db-reset

# Project root — resolves symlinks, works when make is invoked from any directory.
ROOT := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
B := $(ROOT)backend
F := $(ROOT)frontend
MIGRATE_BIN := $(shell which golang-migrate 2>/dev/null || which migrate 2>/dev/null)
ifeq ($(MIGRATE_BIN),)
MIGRATE_CMD = cd $(B) && go run -tags postgres github.com/golang-migrate/migrate/v4/cmd/migrate@latest
else
MIGRATE_CMD = cd $(B) && $(MIGRATE_BIN)
endif

# ─── Development helpers ───────────────────────────────────────────

all: setup db migrate api

# First-time project setup
setup:
	cd $(B) && go mod tidy
	cd $(F) && npm install

# Start Postgres via Docker
db:
	cd $(B) && docker compose up -d postgres
	@echo "Waiting for Postgres to be ready..."
	@sleep 3

# Run database migrations
migrate:
	$(MIGRATE_CMD) -path $(B)/migrations \
		-database "postgres://forge:forge@localhost:5432/forge?sslmode=disable" up

# Reset the database (down then up)
db-reset:
	$(MIGRATE_CMD) -path $(B)/migrations \
		-database "postgres://forge:forge@localhost:5432/forge?sslmode=disable" down -all
	$(MIGRATE_CMD) -path $(B)/migrations \
		-database "postgres://forge:forge@localhost:5432/forge?sslmode=disable" up

# Start the API server
api:
	cd $(B) && go run ./cmd/api

# Start the worker
worker:
	cd $(B) && go run ./cmd/worker

# Start the frontend dev server
frontend:
	cd $(F) && npm run dev

# Start everything needed for development (db + api + frontend)
dev: db api

# Run everything (assumes dependencies and migrations are already set up).
# Ctrl+C stops all processes.
run:
	@trap 'echo "=== Stopping all processes ==="; kill 0 2>/dev/null; exit' EXIT INT TERM; \
	echo "=== Starting Postgres ==="; \
	cd $(B) && docker compose up -d postgres; \
	sleep 3; \
	echo "=== Starting API (background) ==="; \
	cd $(B) && go run ./cmd/api & \
	sleep 2; \
	echo "=== Starting Worker (background) ==="; \
	cd $(B) && go run ./cmd/worker & \
	sleep 1; \
	echo "=== Starting Frontend ==="; \
	cd $(F) && npm run dev

# Run everything from scratch — setup, db, migrations, then all services.
# Safe to run repeatedly: go mod tidy, npm install, and migrate up are all
# idempotent and will not error if already applied.
run-dev:
	@trap 'echo "=== Stopping all processes ==="; kill 0 2>/dev/null; exit' EXIT INT TERM; \
	echo "=== Step 0: Cleaning stale processes ==="; \
	pkill -f "go-build.*api" 2>/dev/null || true; \
	pkill -f "go-build.*worker" 2>/dev/null || true; \
	sleep 1; \
	echo "=== Step 1: Installing dependencies ==="; \
	cd $(B) && go mod tidy; \
	cd $(F) && npm install; \
	echo "=== Step 2: Starting Postgres ==="; \
	cd $(B) && docker compose up -d postgres; \
	sleep 3; \
	echo "=== Step 3: Running migrations ==="; \
	$(MIGRATE_CMD) -path $(B)/migrations \
		-database "postgres://forge:forge@localhost:5432/forge?sslmode=disable" up; \
	echo "=== Step 5: Starting API (background) ==="; \
	cd $(B) && go run ./cmd/api & \
	sleep 2; \
	echo "=== Step 6: Starting Worker (background) ==="; \
	cd $(B) && go run ./cmd/worker & \
	sleep 1; \
	echo "=== Step 7: Starting Frontend ==="; \
	cd $(F) && npm run dev

# Kill stale API/worker binaries from previous runs
kill:
	@pkill -f "go-build.*api" 2>/dev/null || true; \
	pkill -f "go-build.*worker" 2>/dev/null || true; \
	pkill -f "exe/api" 2>/dev/null || true; \
	pkill -f "exe/worker" 2>/dev/null || true; \
	echo "Stale processes cleaned."

# Run all tests
test:
	cd backend && go test ./internal/... -count=1 -v
	cd frontend && npm run test && npm run build

test-backend:
	cd backend && go test ./internal/... -count=1 -v

test-frontend:
	cd frontend && npm run test

test-all: test-backend test-frontend

# Coverage — frontend (c8 + Poku)
coverage-frontend:
	cd frontend && npm run coverage

# Coverage — backend (go test -coverprofile + HTML report)
coverage-backend:
	cd backend && go test -coverprofile=coverage.out ./internal/... 2>&1; \
		go tool cover -html=coverage.out -o coverage.html; \
		echo "=== Coverage HTML: backend/coverage.html ==="

# Coverage — both sides
coverage: coverage-backend coverage-frontend

# Run linter (Biome on frontend)
lint:
	cd frontend && npx biome check src/

# Build everything
build:
	cd backend && go build ./...
	cd frontend && npm run build

# Clean build artifacts
clean:
	cd backend && go clean ./...
	rm -rf frontend/dist

# Restart backend processes without touching Postgres or frontend.
# Run in a separate terminal while make run-dev is active.
restart-backend:
	@echo "=== Killing existing Go processes ==="
	pkill -f "go run.*cmd/api" 2>/dev/null || true
	pkill -f "go run.*cmd/worker" 2>/dev/null || true
	sleep 1
	echo "=== Starting API (background) ==="
	cd $(B) && go run ./cmd/api &
	sleep 2
	echo "=== Starting Worker (background) ==="
	cd $(B) && go run ./cmd/worker &

# Restart everything — Postgres + backend + frontend.
restart:
	$(MAKE) restart-backend
	@echo "=== Frontend unchanged (Vite hot-reloads automatically) ==="

# Full setup from scratch: db → migrate → dev
up: setup db migrate api
