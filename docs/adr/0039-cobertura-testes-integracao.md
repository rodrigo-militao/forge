# ADR 0039: Cobertura de testes (frontend e backend) e testes de integração

## Status
Aceito

## Contexto
Faltava ferramenta definida para medir cobertura de teste em ambos os lados, e para testes de integração de backend contra banco real.

## Decisão

**Frontend — cobertura**: Poku não tem cobertura de código nativa (confirmado — está no roadmap deles, sem previsão). Usar **`c8`** (gratuito, open source, usa instrumentação nativa do V8) envolvendo a execução do Poku: `c8 poku ./tests`.

**Backend — cobertura**: `go test -cover` e `go tool cover -html`, nativos do toolchain Go — nenhuma ferramenta terceira necessária.

**Backend — testes de integração**: **`testcontainers-go`**, subindo um Postgres real em container efêmero durante o teste, em vez de mockar o banco. Mantém coerência com a arquitetura hexagonal (ADR de padrões de código): testa o adapter de verdade (`adapters/postgres/`) contra um banco real, não uma simulação.

**Frontend — testes automatizados**: já coberto pela ADR 0011 (Playwright).

## Consequências
- CI (quando existir) deve rodar: `go test -cover` + testcontainers para backend; `c8 poku` para frontend.
- Sem custo de ferramenta paga (Codecov e similares não são necessários neste estágio — relatório local de `c8`/`go tool cover -html` é suficiente).
- Reforça o mandato de TDD já registrado em `docs/workflow-e-definition-of-done.md` com uma forma concreta de medir se está sendo seguido.
