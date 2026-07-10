# ADR 0013: Bun como runtime e gerenciador de pacotes do frontend (Vite continua como bundler)

## Status
Aceito (emenda à ADR 0010)

## Contexto
Bun é um runtime concorrente do Node.js, com instalação de pacotes muito mais rápida e execução nativa de TypeScript. Poku já suporta Bun nativamente, rodando a mesma suíte de testes em Node, Bun ou Deno. O bundler/dev-server do Bun, porém, ainda é bem mais novo e menos testado em produção para apps React do que o Vite.

## Decisão
- **Bun** como runtime e gerenciador de pacotes do projeto frontend (`bun install`, `bun run`), substituindo Node+npm no dia a dia de desenvolvimento.
- **Vite continua como bundler/dev-server** (ADR 0010) — não é substituído. Vite roda perfeitamente sobre o runtime Bun (`bun run vite dev`), então os dois ganhos coexistem sem conflito.
- Testes unitários (Poku, ADR 0011) rodam via Bun para aproveitar a velocidade de execução nativa.

## Consequências
- Ganho de velocidade em instalação de dependências e execução de testes, sem trocar a cadeia de build já validada (Vite).
- Se o bundler nativo do Bun amadurecer no futuro, a troca do Vite é uma decisão nova e separada, não implícita nesta ADR.
