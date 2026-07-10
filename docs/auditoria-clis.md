# Audit of Legacy CLIs — Passo 1

> Mapeamento dos dois CLIs existentes em `legacy/`, produzido antes de qualquer
> alteração na arquitetura. Para cada arquivo, define se vira **núcleo compartilhado**,
> **módulo de produto**, ou é **descartado** na nova arquitetura.

---

## 1. Newsletter Assistant (`legacy/newsletter-cli/`)

### 1.1 Estrutura de pastas e módulos

```
newsletter-cli/
├── cmd/akme/
│   ├── main.go              # CLI entry point (cobra), .env loading
│   ├── discovery.go         # "akme discovery" subcommand — pipeline orchestrator
│   └── inspire.go           # placeholder — not implemented
├── internal/
│   ├── config/
│   │   └── config.go        # Tenant config from YAML (RSS feeds, search queries, filters)
│   ├── discovery/
│   │   ├── agent.go         # Discovery pipeline orchestrator: fetch → classify → write digest
│   │   └── prompts/
│   │       └── discovery.txt  # LLM system prompt for article classification
│   ├── direct/
│   │   └── client.go        # Anthropic Messages API client (LLMClient impl)
│   ├── llm/
│   │   └── client.go        # LLMClient interface, Message, LLMRequest/Response, Usage, Tool
│   ├── models/
│   │   ├── article.go       # Article struct
│   │   ├── digest.go        # Digest, DigestItem, ItemStatus types
│   │   ├── errors.go        # Sentinel errors (ErrNotFound, ErrAlreadyExists)
│   │   └── source.go        # ContentSource interface (RSS, web search)
│   ├── openai/
│   │   └── client.go        # OpenAI-compatible Chat Completions client (LLMClient impl)
│   ├── retry/
│   │   └── retry.go         # Generic retry with exponential backoff + jitter
│   ├── rss/
│   │   └── parser.go        # RSS/Atom feed reader (gofeed), implements ContentSource
│   ├── search/
│   │   └── search.go        # DuckDuckGo Lite web search, implements ContentSource
│   └── storage/
│       ├── storage.go       # Storage interface (WriteDigest, ReadDigest, ApproveItem, etc.)
│       └── filestore.go     # File-based Storage implementation
├── data/tenants/akme/
│   └── config/sources.yaml  # Tenant source configuration (4 RSS feeds, 4 search queries)
├── .env.example
├── go.mod / go.sum
└── README.md
```

### 1.2 Dependências externas

| Dependência | Uso | Destino |
|---|---|---|
| `github.com/PuerkitoBio/goquery` | HTML parsing (DuckDuckGo search results) | Módulo Digest |
| `github.com/joho/godotenv` | `.env` loading | **Descartado** (Docker env vars) |
| `github.com/mmcdole/gofeed` | RSS/Atom feed parsing | Módulo Digest |
| `github.com/spf13/cobra` | CLI framework | **Descartado** (substituído por API HTTP) |
| `golang.org/x/time/rate` | Rate limiting LLM calls | Núcleo compartilhado |
| `gopkg.in/yaml.v3` | YAML config parsing | **Descartado** (config vira dado no DB) |

### 1.3 Núcleo vs. produto vs. descartado

| Arquivo | Destino | Justificativa |
|---|---|---|
| `internal/llm/client.go` | **Núcleo** → `core/ports/llm.go` | Interface LLMClient (Complete) é consumida por ambos os produtos. A interface em si é núcleo puro. |
| `internal/models/errors.go` | **Núcleo** → `core/domain/errors.go` | Sentinel errors (ErrNotFound) são transversais. |
| `internal/retry/retry.go` | **Núcleo** → `internal/lib/retry.go` | Retry genérico com exponential backoff, sem dependência de domínio. |
| `internal/models/article.go` | **Núcleo** → `core/domain/` | Article como conceito de "conteúdo de fonte externa" é usado pelo Digest. O schema `generated_content` substitui o armazenamento, mas a estrutura de artigo-fonte deve virar entidade de domínio (`SourceItem` ou similar). |
| `internal/models/digest.go` | **Digest** → `internal/digest/domain/` | Digest, DigestItem e ItemStatus são específicos do pipeline de curadoria. |
| `internal/models/source.go` | **Digest** → `internal/digest/domain/` | ContentSource interface (Fetch) é específica do Digest (busca em fontes). |
| `internal/discovery/agent.go` | **Digest** → `internal/digest/application/` | Orquestração do pipeline de descoberta é lógica de aplicação do Digest. |
| `internal/discovery/prompts/discovery.txt` | **Digest** → `internal/digest/` | Prompt de classificação de artigos é específico do Digest. |
| `internal/rss/parser.go` | **Digest** → `internal/digest/adapters/` | RSS feed reader é adapter de fonte de conteúdo. |
| `internal/search/search.go` | **Digest** → `internal/digest/adapters/` | Web search (DuckDuckGo) é adapter de fonte de conteúdo. |
| `internal/config/config.go` | **Descartado** | Config de fontes (RSS feeds, queries, filtros) vira dado por tenant no banco (tabela `sources`). |
| `internal/storage/storage.go` | **Descartado** | Interface Storage é substituída por repositórios Postgres via sqlc nos módulos de produto. |
| `internal/storage/filestore.go` | **Descartado** | FileStore é substituído por `adapters/postgres/` nos dois produtos. |
| `internal/openai/client.go` | **Núcleo** (como template) → `adapters/llm/openai.go` | Implementação concreta de LLMClient, mas precisa ser refatorada para usar `core/ports` e `slog` em vez de log de pacote. A interface já existe em `llm/client.go` — a implementação vira adapter. |
| `internal/direct/client.go` | **Descartado no MVP** (ADR 0004) | Anthropic Direct API não será usada no MVP. O código fica como referência para extensão futura. |
| `cmd/akme/main.go` | **Descartado** | Substituído por entry point único da API HTTP (`cmd/api/main.go`). A lógica de `.env`/flags é substituída por Docker env vars. |
| `cmd/akme/discovery.go` | **Descartado** | Substituído pelo handler HTTP em `adapters/http/` que insere job na fila. |
| `data/tenants/akme/config/sources.yaml` | **Descartado** | Vira seed data no banco multi-tenant. |

### 1.4 Hardcoded/local → multi-tenant data

| Hoje | Amanhã |
|---|---|
| `LLM_API_KEY` em `.env` (única, hardcoded) | Mantida como env var única da plataforma (ADR 0004) |
| `sources.yaml` com feeds e queries por tenant | Tabela `sources` no banco, com `user_id` FK |
| Diretório `~/.akme/tenants/{id}/` | Schema Postgres com `user_id` em toda tabela |
| Arquivo `digest-1.md` por data | Tabela `generated_content` com `status`, `product`, `user_id` |
| Arquivos de aprovação em `approved/YYYY/` | Status em `generated_content.status` (draft → approved/rejected) |
| Flags CLI `--tenant`, `--data-dir` | `user_id` do cookie de sessão (JWT), sem argumento CLI |

---

## 2. Content Editor CLI (`legacy/content-editor-cli/`)

### 2.1 Estrutura de pastas e módulos

```
content-editor-cli/
├── cmd/
│   ├── topic-generator/
│   │   └── main.go           # Standalone binary: LLM → topic → save JSON + history
│   └── writer/
│       └── main.go            # Standalone binary: topic → voice → LLM → article
├── internal/
│   ├── topicgen/
│   │   ├── types.go           # Topic, HistoryEntry structs
│   │   ├── generator.go       # OpenAI-compatible API call → parse topic JSON
│   │   ├── history.go         # File-based topic history (JSON append)
│   │   └── topicgen_test.go   # Tests
│   └── writer/
│       ├── types.go           # Article, Topic structs
│       ├── router.go          # SelectVoice: deterministic theme_area+format → voice
│       ├── voices.go          # 4 voice profile constants
│       ├── generator.go       # OpenAI-compatible API call → parse article JSON
│       └── writer_test.go     # Tests
├── .env.example
└── go.mod / go.sum
```

### 2.2 Dependências externas

| Dependência | Uso | Destino |
|---|---|---|
| `github.com/joho/godotenv` | `.env` loading | **Descartado** (Docker env vars) |

### 2.3 Núcleo vs. produto vs. descartado

| Arquivo | Destino | Justificativa |
|---|---|---|
| `internal/writer/voices.go` | **Núcleo** → `core/domain/voice.go` | As 4 vozes (Confessional, Clean Technical, Framework, Essay) são conceitos de domínio compartilhados entre produtos? Na verdade, são específicas do Compose — movem para `internal/compose/domain/`. |
| `internal/writer/router.go` | **Compose** → `internal/compose/domain/` | Roteamento determinístico de voz (theme_area + format → voice) é lógica de domínio do Compose. |
| `internal/writer/types.go` | **Compose** → `internal/compose/domain/` | Article (output) e Topic (input) são tipos do domínio de geração. |
| `internal/topicgen/types.go` | **Compose** → `internal/compose/domain/` | Topic e HistoryEntry são do domínio do Topic Generator. |
| `internal/topicgen/generator.go` | **Compose** → `internal/compose/application/` | Orquestração da chamada LLM para geração de tópico. A lógica de prompt building fica no domínio; a chamada HTTP usa o LLMClient do núcleo. |
| `internal/writer/generator.go` | **Compose** → `internal/compose/application/` | Orquestração da chamada LLM para escrita do artigo. |
| `internal/topicgen/history.go` | **Descartado** | File-based history substituído por tabela `generated_content` ou tabela de histórico específica no banco. |
| `cmd/topic-generator/main.go` | **Descartado** | Substituído por handler HTTP em `adapters/http/` que insere job na fila. |
| `cmd/writer/main.go` | **Descartado** | Substituído por handler HTTP + worker que processa jobs. |

### 2.4 Hardcoded/local → multi-tenant data

| Hoje | Amanhã |
|---|---|
| `topic-history.json` (arquivo local) | Tabela `generated_content` (ou `topic_history`) com `user_id` FK |
| `LLM_API_KEY` / `LLM_BASE_URL` em `.env` | Mantida como env var única da plataforma (ADR 0004) |
| Modelo hardcoded (`pro/deepseek-v4-flash`) | Mantido fixo no MVP (ADR 0004) |
| Flags CLI (`--topic`, `--format`, `--voice`) | Parâmetros via API HTTP (POST /compose/generate com payload) |

---

## 3. Padrões duplicados entre os dois CLIs (candidatos a unificação)

| Padrão | Ocorrências | Solução |
|---|---|---|
| Chamada HTTP para API OpenAI-compatível | `internal/openai/client.go`, `internal/topicgen/generator.go`, `internal/writer/generator.go` | Um único `adapters/llm/openai.go` implementando `core/ports.LLMClient` |
| Construção de request/parse de resposta JSON do LLM | Duplicado nos 3 lugares acima | Centralizado no adapter LLM |
| Rate limiting de chamadas LLM | Só em `internal/openai/` e `internal/direct/` | Incorporado ao adapter LLM único |
| Sentinela `ErrNotFound` | `internal/models/errors.go` | `core/domain/errors.go` |
| Função `truncate` | `internal/discovery/agent.go`, `internal/writer/generator.go`, `internal/topicgen/generator.go` | Utilitário em `internal/lib/` |
| Função `atoi` | `internal/discovery/agent.go`, `internal/storage/filestore.go` | Eliminada (substituída por tipos reais do Go) |

---

## 4. Resumo: o que vira o quê

```
Núcleo compartilhado (core/):
  └─ core/ports/llm.go           ← internal/llm/client.go (interface)
  └─ core/domain/errors.go        ← internal/models/errors.go
  └─ internal/lib/retry.go        ← internal/retry/retry.go
  └─ adapters/llm/openai.go       ← internal/openai/client.go (refatorado)

Produto Digest (internal/digest/):
  └─ domain/                      ← internal/models/article.go, digest.go, source.go (adaptado)
  └─ application/                 ← internal/discovery/agent.go
  └─ adapters/rss/                ← internal/rss/parser.go
  └─ adapters/search/             ← internal/search/search.go
  └─ adapters/postgres/           ← novo (sqlc)

Produto Compose (internal/compose/):
  └─ domain/                      ← internal/writer/types.go, voices.go, router.go; internal/topicgen/types.go
  └─ application/                 ← internal/topicgen/generator.go, internal/writer/generator.go
  └─ adapters/postgres/           ← novo (sqlc)

Descartado:
  ├── cmd/                        (substituído por cmd/api/main.go + cmd/worker/main.go)
  ├── internal/storage/            (substituído por adapters/postgres/)
  ├── internal/config/             (config vira dado no banco)
  ├── internal/direct/             (adiado pós-MVP)
  ├── internal/topicgen/history.go (substituído por banco)
  ├── data/                        (seeds, não código)
  └── .env / godotenv              (Docker env vars)
```
