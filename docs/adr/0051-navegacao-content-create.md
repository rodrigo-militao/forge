# ADR 0051: Navegação reorganizada — Discover / Content (Articles, Newsletters, Ideas) / Library / Settings + botão global "+ Create"

## Status
Aceito (reorganiza a navegação do design system, seção 7 — nomenclatura de módulos)

## Contexto
A navegação atual (Digest/Compose/Newsletters/Library/Settings, todos como itens de primeiro nível) não comunica que Article, Newsletter e Idea são "tipos de conteúdo" dentro de um mesmo sistema editorial. A visão de produto propõe agrupar isso sob "Content", com criação centralizada num botão global.

## Decisão

**Navegação nova**:
```
Discover (ADR 0047)
Content
  ├── Articles     (era "Compose" — módulo interno de código permanece internal/compose, ver nota abaixo)
  ├── Newsletters  (ADR 0042/0046, sem mudança de comportamento)
  └── Ideas        (ADR 0049, novo)
Library
Settings
```

**Botão global "+ Create"**, sempre visível (ex.: header ou sidebar), abrindo um seletor:
```
Article    — Write something from an idea or topic
Newsletter — Curate and write an edition
Idea       — Capture a thought for later
```
Cada opção leva ao fluxo de criação já existente daquele tipo (Article: ADR 0030/0050; Newsletter: ADR 0042/0046; Idea: ADR 0049).

**Nomes internos**: manter `internal/compose` no código-fonte (renomear é risco de refatoração ampla sem ganho funcional, mesmo princípio da ADR 0047) — só a label visível na navegação muda de "Compose" para "Articles". Rotas de frontend podem ser ajustadas para refletir a nova hierarquia (`/content/articles`, `/content/newsletters`, `/content/ideas`) já que isso é só estrutura de URL, não schema.

**Library permanece** como visão geral de todo conteúdo (todos os tipos, busca/filtro por tag — ADR 0037/0041/0045), distinta das listas específicas por tipo dentro de "Content".

## Consequências
- Atualiza `docs/design-system.md` seção 7 (nomenclatura de módulos) — Digest→Discover, Compose→Articles (label), adiciona Newsletters e Ideas como itens de "Content".
- Editorial Calendar e Repurposing (mencionados na visão de produto) **ficam fora deste lote** — registrados como backlog no `plan.md`, sem desenho técnico ainda.
- Esta é a mudança de maior superfície visual do lote — toca toda a estrutura de navegação existente, então deve ser implementada primeiro (fundação), antes de Ideas/Outline/Inbox, que dependem de onde essas telas vão morar na nova estrutura.
