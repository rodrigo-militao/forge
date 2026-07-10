# ADR 0010: Stack de frontend — React + Vite (SPA), sem Next.js

## Status
Aceito

## Contexto
O fundador não é especialista em frontend e vai depender fortemente de IA (Claude Code) para implementação. A aplicação é inteiramente atrás de autenticação (não há necessidade de SEO ou renderização no servidor). A preocupação central é performance numa interface com edição de texto pesada e listas longas de conteúdo (fila de aprovação, histórico).

## Decisão

**Framework**: React (não Vue, não Angular).
- Maior volume de treinamento/exemplos entre os três — reduz risco de erro de implementação por IA, que é o principal fator de risco técnico dado o perfil do fundador.
- Angular descartado por ser pesado e opinativo demais para o contexto (fundador solo + IA, ~5h/semana).
- Vue tem méritos técnicos reais (reatividade fina), mas não supera a vantagem prática de "IA erra menos" no ecossistema React.

**Build tool**: Vite. SPA simples, sem Next.js — a aplicação não precisa de SSR/SSG porque não há conteúdo público indexável (tudo fica atrás de login). Next.js adicionaria complexidade de deploy no Cloudflare Pages (adaptador `next-on-pages`) sem benefício correspondente. Se um site institucional/marketing público for necessário no futuro, deve ser um projeto separado, não parte deste app.

**Editor de texto rico**: TipTap (sobre ProseMirror). Gerencia o próprio estado de edição fora do ciclo de render do React; extensível para blocos customizados; documentação madura o suficiente para implementação via IA. Preferido a Lexical (menos conteúdo de treinamento disponível, maior risco de erro de implementação).

**Estado de servidor**: TanStack Query — cache e invalidação de dados vindos da API (drafts, fontes, aprovações), evita boilerplate manual de loading/error e reduz re-renders desnecessários.

**Estado local/UI**: Zustand — leve, sem boilerplate de Redux, para estado efêmero (modais, painéis abertos).

**Formulários**: React Hook Form — inputs não-controlados por padrão, evita re-render a cada tecla digitada (relevante para a meta de performance).

**Virtualização de listas**: TanStack Virtual — necessário para listas longas (fila de aprovação, Library) para não criar gargalo de renderização.

**Estilo**: Tailwind CSS, mapeando diretamente os tokens definidos em `docs/design-system.md`.

## Consequências
- Todo componente novo deve seguir esse conjunto de bibliotecas — não introduzir alternativas concorrentes (ex.: Redux, styled-components) sem nova ADR.
- A ausência de SSR significa que performance de carregamento inicial depende de code-splitting (lazy loading de rotas por feature) — considerar isso no Passo 7.
- Se necessidade de SEO/site público surgir depois, tratar como projeto novo, não retrofit deste app.
