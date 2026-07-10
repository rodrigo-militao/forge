# Forge

**Digest + Compose** — Two content products on a shared multi-tenant core.

Forge is a platform with two products:
- **Digest** — daily content curation via RSS + web search, classified by LLM
- **Compose** — AI-assisted article writing with voice profiles and topic management

Built with Go (hexagonal architecture) + React (SPA), deployed via Docker.

## Architecture

```
backend/                          # Go monorepo
├── cmd/api/main.go               # HTTP server (chi router)
├── cmd/worker/main.go            # Async job processor
├── internal/
│   ├── core/domain/              # Shared entities (User, Job, GeneratedContent)
│   ├── core/ports/               # Interfaces (LLMClient, Repository)
│   ├── digest/                   # Digest product (domain + application + adapters)
│   ├── compose/                  # Compose product (domain + application)
│   ├── adapters/
│   │   ├── llm/                  # OpenAI-compatible LLM client
│   │   ├── postgres/             # sqlc-generated + hand-written repositories
│   │   └── http/                 # Chi handlers, auth, middleware
│   ├── lib/                      # Retry, logger (slog + request_id)
│   └── worker/                   # Job queue polling + handlers
├── migrations/                   # golang-migrate schema
├── db/queries/                   # sqlc query files
├── Dockerfile                    # Multi-stage build
├── docker-compose.yml            # api + worker + postgres
└── Caddyfile                     # Reverse-proxy

frontend/                         # React SPA
├── src/
│   ├── app/router.tsx            # TanStack Router
│   ├── routes/                   # Page components
│   ├── api/client.ts             # Typed fetch wrapper
│   ├── i18n/                     # en, pt, es
│   ├── features/auth/            # Zustand auth store
│   └── styles/app.css            # Tailwind + design tokens
└── vite.config.ts                # Dev proxy to backend
```

## Quick start

### Prerequisites

- Go 1.25+
- Node.js 22+
- Docker + Docker Compose (for Postgres)

### 1. Start Postgres

```bash
cd backend
docker compose up -d postgres
```

### 2. Run migrations

```bash
go run github.com/golang-migrate/migrate/v4/cmd/migrate@latest \
  -path migrations \
  -database "postgres://forge:forge@localhost:5432/forge?sslmode=disable" up
```

### 3. Start the API

```bash
cp .env.example .env   # edit LLM_API_KEY
go run ./cmd/api
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

### 5. Start the worker (optional — for job processing)

```bash
cd backend
go run ./cmd/worker
```

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | No | Create account |
| POST | /api/auth/login | No | Log in |
| POST | /api/auth/logout | Yes | Log out |
| GET | /api/auth/me | Yes | Current user |
| GET | /api/content | Yes | List generated content |
| POST | /api/content/{id}/approve | Yes | Approve content |
| POST | /api/content/{id}/reject | Yes | Reject content |
| POST | /api/digest/run | Yes | Enqueue curation job |
| POST | /api/compose/generate-topic | Yes | Enqueue topic gen job |
| POST | /api/compose/write | Yes | Enqueue article write job |
| GET | /api/health | No | Health check |

## Tech stack

### Backend

| Component | Choice | ADR |
|-----------|--------|-----|
| Language | Go 1.25 | — |
| HTTP router | chi/v5 | 0023 |
| Database | PostgreSQL 16 | 0020 |
| SQL generation | sqlc + pgx/v5 | 0024 |
| Migrations | golang-migrate | 0025 |
| Auth | JWT (httpOnly cookie) | 0007, 0017 |
| LLM client | OpenAI-compatible | 0004 |
| Job queue | Postgres (polling) | 0028 |
| Scheduler | robfig/cron/v3 | 0026 |
| Logging | slog | 0027 |

### Frontend

| Component | Choice | ADR |
|-----------|--------|-----|
| Framework | React + TypeScript | 0010 |
| Bundler | Vite | 0010 |
| CSS | Tailwind v4 | 0010 |
| Router | TanStack Router | 0014 |
| Data fetching | TanStack Query | 0010 |
| State | Zustand | 0010 |
| i18n | react-i18next | 0009 |
| UI primitives | Radix UI | 0018 |
| Icons | Lucide | 0010 |
| Lint/format | Biome | 0019 |

## ADRs

All architectural decisions are documented in [docs/adr/](docs/adr/).
