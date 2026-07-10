# Plano de implementação — SaaS de criação de conteúdo (Newsletter Assistant + Content Editor)

> Contexto e decisões arquiteturais completas: ver `docs/adr/`. Termos: ver `docs/glossario.md`.
> Este plano é para ser executado um passo de cada vez, nessa ordem. Cada passo tem objetivo, entregáveis e critério de "pronto". Não pule passos — cada um depende do anterior.

## Stack e princípios (fixados, não renegociar a cada passo)
- **Linguagem/backend**: Go
- **Banco**: PostgreSQL
- **Frontend**: SPA simples, hospedado no Cloudflare Pages (gratuito)
- **Infra**: Docker + docker-compose desde o dia 1, local e depois em VPS (Hetzner ou equivalente)
- **LLM**: provedor único do fundador no MVP (ADR 0004)
- **Auth**: usuário/senha simples (ADR 0007)
- **Billing**: flag manual `plano_ativo` (ADR 0008)
- **Publicação**: manual, sem integração externa no MVP (ADR 0003)
- **Revisão**: obrigatória em todo conteúdo gerado (ADR 0005)
- **Idioma do código**: inglês, sempre — código, comentários, nomes de variáveis/tabelas, commits (ADR 0009)
- **i18n da interface**: inglês (default), português, espanhol, desde a primeira tela (ADR 0009)
- **Frontend**: React + Vite (SPA, sem Next.js) + TipTap + TanStack Query/Virtual/Router + Zustand + React Hook Form + Tailwind CSS + Radix UI (ADR 0010, 0014, 0018)
- **Runtime/pacotes do frontend**: Bun; Vite continua como bundler (ADR 0013)
- **Lint/format do frontend**: Biome (ADR 0019)
- **Arquitetura de frontend**: organizada por domínio/feature, não por tipo técnico (ADR 0012)
- **Testes**: Poku para unitário; Playwright para componente e end-to-end (ADR 0011)
- **Contrato de API**: OpenAPI gerado a partir do backend Go; tipos TypeScript gerados a partir dela (ADR 0015)
- **Atualização de conteúdo no frontend**: polling via TanStack Query, sem WebSocket/SSE no MVP (ADR 0016)
- **Token de sessão**: cookie httpOnly, nunca localStorage (ADR 0017)
- **Router HTTP (backend)**: chi, sobre `net/http` puro (ADR 0023)
- **Acesso a dados**: sqlc + pgx, sem ORM (ADR 0024)
- **Migrations**: golang-migrate (ADR 0025)
- **Agendamento (cron)**: robfig/cron, rodando em container de worker separado da API (ADR 0026)
- **Fila assíncrona**: tabela `jobs` no Postgres com `SELECT FOR UPDATE SKIP LOCKED`, sem broker externo (ADR 0028)
- **Reverse proxy**: Caddy na VPS (ADR 0021)
- **Cache/Redis**: não usado no MVP (ADR 0022)
- **Logging**: `log/slog` estruturado com `request_id`, sem ferramenta externa de observabilidade (ADR 0027)
- **Arquitetura de backend**: hexagonal (ports & adapters) por domínio, núcleo (`core/`) nunca importa adapters

---

## Passo 1 — Auditoria dos 2 CLIs existentes
**Objetivo**: mapear com precisão o que existe hoje, antes de tocar em arquitetura nova.

**Entregáveis**:
- Documento curto (`docs/auditoria-clis.md`) listando, para cada CLI (Newsletter Assistant, Content Editor):
  - Estrutura de pastas e módulos atuais
  - Dependências externas (bibliotecas, APIs)
  - O que é claramente "núcleo" (reaproveitável) vs. "específico do produto"
  - O que hoje é hardcoded/config local que precisará virar dado por tenant

**Pronto quando**: você consegue apontar, para qualquer arquivo dos 2 CLIs, se ele vira núcleo compartilhado, módulo de produto, ou é descartado.

---

## Passo 2 — Identidade visual e nome
**Objetivo**: nome, paleta, tom visual mínimo — o suficiente para o frontend do Passo 7 não nascer genérico.

**Entregáveis**:
- Nome do produto/plataforma
- Paleta de cores + tipografia (2-3 decisões, não um brand book completo)
- Logo simples (pode ser texto estilizado no MVP)

**Pronto quando**: existe o suficiente para aplicar no frontend sem bloquear o desenvolvimento por indecisão visual.

---

## Passo 3 — Modelagem multi-tenant do banco de dados
**Objetivo**: schema Postgres inicial, com isolamento por tenant desde a primeira tabela (ADR 0002).

**Entregáveis**:
- Schema com no mínimo: `users` (tenant + `plano_ativo` [ADR 0008] + `locale` [ADR 0009, default `en`]), `sources` (fontes de conteúdo), `topics`, `generated_content` (com `status`: draft/aprovado, `product`: newsletter/editor), `voice_routing_config`, `jobs` (fila assíncrona: `id`, `user_id`, `type`, `status`, `payload` JSONB, `created_at`, `updated_at`, `error` — ver ADR 0028)
- Migrations versionadas via golang-migrate (ADR 0025)

**Pronto quando**: todas as tabelas que guardam dado de usuário têm `user_id` como chave estrangeira obrigatória.

---

## Passo 4 — Extração do núcleo compartilhado
**Objetivo**: transformar o que o Passo 1 identificou como "núcleo" em um módulo Go único, usado pelos dois produtos (ADR 0001), seguindo arquitetura hexagonal (ports & adapters).

**Entregáveis**:
- `internal/core/domain`: entidades e value objects, Go puro, zero import de infraestrutura
- `internal/core/ports`: interfaces (`Repository`, `LLMClient`, `Scheduler`) que os adapters vão implementar
- Os dois CLIs antigos passam a ser consumidores desse núcleo, não implementações duplicadas
- Logging estruturado (`log/slog`) com `request_id` disponível desde já como utilitário transversal (ADR 0027)

**Pronto quando**: uma mudança na lógica de chamada LLM (ex.: retry) precisa ser feita em um lugar só, não em dois — e nada em `domain/`/`ports/` importa um pacote de `adapters/`.

---

## Passo 5 — Reorganização dos produtos sobre o núcleo
**Objetivo**: Digest e Compose viram módulos de produto (`internal/digest`, `internal/compose`) com `domain/`, `application/` e `adapters/` próprios, consumindo o núcleo do Passo 4.

**Entregáveis**:
- `internal/digest`: pipeline de busca de fontes → ranking → fila de aprovação
- `internal/compose`: Topic Generator → roteamento de voz → geração → draft
- Adapters de persistência (`adapters/postgres/`) implementados com sqlc + pgx (ADR 0024), satisfazendo as interfaces de `core/ports`
- Ambos gravando em `generated_content` com `status=draft` (ADR 0005)

**Pronto quando**: rodando via CLI/linha de comando local (ainda sem API HTTP), você consegue gerar conteúdo de teste nos dois produtos usando o mesmo banco multi-tenant, e nenhum pacote de `domain/`/`application/` importa `adapters/`.

---

## Passo 6 — Autenticação e API HTTP
**Objetivo**: expor o backend via API, com login simples (ADR 0007).

**Entregáveis**:
- Router HTTP com chi (ADR 0023); handlers finos em `adapters/http/`, sem lógica de negócio
- Endpoints REST: login, logout, CRUD de fontes/tópicos por tenant, listagem de conteúdo (draft/aprovado), aprovação/rejeição de item
- Endpoint de ação assíncrona (ex.: "gerar agora"): insere linha em `jobs` e responde `202 Accepted` com `job_id` (ADR 0028), sem esperar o processamento
- Middleware de auth que injeta `user_id` em toda request autenticada
- Sessão via cookie httpOnly (ADR 0017), com `SameSite`/`Secure` configurados corretamente
- Especificação OpenAPI gerada a partir do código (ADR 0015), publicada/acessível para o frontend consumir no Passo 7

**Pronto quando**: dá para fazer o fluxo completo (login → configurar → listar draft → aprovar) via curl/Postman, a spec OpenAPI reflete fielmente os endpoints implementados, e uma ação assíncrona retorna imediatamente sem bloquear a requisição.

---

## Passo 7 — Frontend mínimo (Cloudflare Pages)
**Objetivo**: interface web usável, aplicando a identidade visual do Passo 2, a estrutura de i18n da ADR 0009, o stack técnico da ADR 0010 e a organização por domínio da ADR 0012.

**Entregáveis**:
- Projeto Vite + React (rodando sobre Bun, ADR 0013), estrutura de pastas por domínio (`features/digest`, `features/compose`, `features/library`, `features/settings`, `features/auth`, `shared/`, `app/`)
- Tipos TypeScript gerados a partir da spec OpenAPI do backend (ADR 0015) — não escritos manualmente
- TanStack Router para navegação entre domínios, com lazy loading por feature (ADR 0014)
- TipTap integrado para edição/revisão de conteúdo gerado
- TanStack Query para chamadas à API, com polling (`refetchInterval`) nas telas de fila de aprovação e drafts (ADR 0016); Zustand para estado local de UI; React Hook Form nas telas de configuração
- TanStack Virtual na fila de aprovação e na Library
- Radix UI como base de modais/dropdowns/selects/tooltips, estilizados com Tailwind (ADR 0018)
- Biome configurado para lint/format (ADR 0019)
- Setup de i18n (`react-i18next` ou equivalente) configurado desde o primeiro componente — nenhuma string de UI hardcoded, mesmo que só o inglês esteja com tradução completa no início
- Arquivos de tradução `en.json` (default), `pt.json`, `es.json` — podem começar só com o inglês populado e os outros dois como esqueleto, mas a estrutura já existe
- Login (com cookie httpOnly, ADR 0017)
- Tela de configuração (fontes para Digest; tópicos/vozes para Compose)
- Fila de revisão/aprovação (comum aos dois produtos, ver ADR 0005)
- Botão de exportar/copiar conteúdo aprovado (sem publicação automática, ADR 0003)
- Seletor de idioma persistindo no campo `locale` do usuário (Passo 3)
- Testes unitários (Poku) para lógica isolada de cada feature
- Testes de componente e end-to-end (Playwright) cobrindo o ciclo completo: login → configurar → gerar → revisar → aprovar → exportar

**Pronto quando**: um usuário (você) consegue fazer o ciclo completo pela interface, sem tocar em terminal ou banco diretamente, trocar o idioma da interface sem nenhuma string em texto fixo sobrando, e a suíte de testes (Poku + Playwright) roda e passa localmente.

---

## Passo 8 — Rate limiting e quota por tenant
**Objetivo**: proteger o custo de LLM, que é do fundador no MVP (ADR 0004).

**Entregáveis**:
- Limite configurável por tenant (ex.: N gerações/mês)
- Bloqueio claro na API/UI quando o limite é atingido, referenciando `plano_ativo` (ADR 0008)

**Pronto quando**: um tenant não consegue gerar conteúdo ilimitado nem contornar o limite via API direta.

---

## Passo 9 — Dockerização completa
**Objetivo**: `docker-compose` único que sobe API + worker + Postgres + Caddy, local ou em qualquer VPS (ADR 0006).

**Entregáveis**:
- `Dockerfile` do backend Go (imagem única, comandos diferentes para `api` e `worker`)
- `docker-compose.yml` com serviços: `api`, `worker` (cron via robfig/cron, processando também a tabela `jobs`, ADR 0026/0028), `postgres`, `caddy` (ADR 0021)
- `Caddyfile` mínimo (domínio → porta do serviço `api`)
- Variáveis de ambiente documentadas (`.env.example`)

**Pronto quando**: `docker-compose up` sobe o sistema completo do zero em qualquer máquina, sem passos manuais extras.

---

## Passo 10 — Validação local end-to-end (MVP local)
**Objetivo**: MVP funcionando 100% local, sem cobrança, sem publicação automática (critério definido nas ADRs).

**Entregáveis**:
- Você consegue: logar → configurar fonte/tópico → gerar conteúdo em qualquer um dos dois produtos → revisar → aprovar → exportar manualmente
- Rodando via `docker-compose up` local

**Pronto quando**: esse ciclo funciona sem intervenção manual no banco, do início ao fim.

---

## Passo 11 — Deploy em VPS + testes com amigos
**Objetivo**: sair do local para uma VPS barata, com pessoas reais além de você testando (ADR 0006).

**Entregáveis**:
- VPS provisionada (Hetzner ou equivalente), com o mesmo `docker-compose` do Passo 9
- Hardening básico: firewall, SSH key-only, backup do Postgres
- Frontend publicado no Cloudflare Pages apontando para a API da VPS
- 2-3 amigos com `plano_ativo=true` usando de verdade

**Pronto quando**: pessoas fora de você geram e aprovam conteúdo real na plataforma, na VPS, sem sua intervenção direta a cada uso.

---

## Fora do escopo deste plano (intencionalmente adiado)
- Billing real / integração de pagamento (ADR 0008)
- OAuth / login social (ADR 0007)
- "Traga sua própria API key" de LLM (ADR 0004)
- Publicação automática em qualquer plataforma externa (ADR 0003)
- Qualquer forma de autonomia sem revisão humana (ADR 0005)

Esses itens só devem ser retomados depois do MVP validado com uso real, como decisões novas e deliberadas — não como continuação automática deste plano.
