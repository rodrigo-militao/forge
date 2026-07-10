-- Initial multi-tenant schema for Forge.
-- Every user-data table carries user_id as a required FK (ADR 0002).

-- ============================================================
-- Users (tenants)
-- ============================================================
CREATE TABLE users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    name          TEXT        NOT NULL,
    plano_ativo   BOOLEAN     NOT NULL DEFAULT false,
    locale        TEXT        NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'pt', 'es')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Sources — RSS feeds, web search queries (Digest product)
-- ============================================================
CREATE TABLE sources (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name       TEXT        NOT NULL,
    type       TEXT        NOT NULL CHECK (type IN ('rss', 'web_search')),
    config     JSONB       NOT NULL DEFAULT '{}',
    enabled    BOOLEAN     NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sources_user_id ON sources(user_id);

-- ============================================================
-- Topics — article topic configurations (Compose product)
-- ============================================================
CREATE TABLE topics (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    topic            TEXT        NOT NULL,
    theme_area       TEXT        CHECK (theme_area IN ('backend_infra', 'ai', 'personal_dev', 'content_creation')),
    format           TEXT        CHECK (format IN ('tutorial', 'deep_dive', 'framework', 'essay')),
    one_line_pitch   TEXT,
    enabled          BOOLEAN     NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_topics_user_id ON topics(user_id);

-- ============================================================
-- Generated content — output from both Digest and Compose
-- status: draft → approved | rejected (ADR 0005)
-- product: 'digest' or 'compose' (maps to the two products)
-- ============================================================
CREATE TABLE generated_content (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product        TEXT        NOT NULL CHECK (product IN ('digest', 'compose')),
    status         TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'rejected')),
    source_type    TEXT        CHECK (source_type IN ('topic', 'discovery')),
    title          TEXT,
    body_markdown  TEXT,
    metadata       JSONB       NOT NULL DEFAULT '{}',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_generated_content_user_id   ON generated_content(user_id);
CREATE INDEX idx_generated_content_status    ON generated_content(status);
CREATE INDEX idx_generated_content_product   ON generated_content(product);

-- ============================================================
-- Voice routing config — deterministic mapping per user
-- (Compose product)
-- ============================================================
CREATE TABLE voice_routing_config (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    theme_area TEXT        NOT NULL,
    format     TEXT        NOT NULL,
    voice      TEXT        NOT NULL CHECK (voice IN ('confessional', 'clean_technical', 'framework', 'essay')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, theme_area, format)
);

CREATE INDEX idx_voice_routing_user_id ON voice_routing_config(user_id);

-- ============================================================
-- Jobs — async job queue (ADR 0028)
-- Processed by worker via SELECT FOR UPDATE SKIP LOCKED
-- ============================================================
CREATE TABLE jobs (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT        NOT NULL,
    status     TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
    payload    JSONB       NOT NULL DEFAULT '{}',
    error      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_status    ON jobs(status);
CREATE INDEX idx_jobs_user_id   ON jobs(user_id);

-- ============================================================
-- Usage counters for rate limiting (Passo 8 / ADR 0022)
-- ============================================================
CREATE TABLE usage_counters (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month      DATE        NOT NULL DEFAULT date_trunc('month', now()),
    count      INTEGER     NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, month)
);

CREATE INDEX idx_usage_counters_user_id ON usage_counters(user_id);
