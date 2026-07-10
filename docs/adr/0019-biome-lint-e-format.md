# ADR 0019: Biome para lint e formatação (não ESLint + Prettier)

## Status
Aceito

## Contexto
Nenhuma ferramenta de lint/formatação estava decidida para o frontend. O projeto já adotou Bun como runtime (ADR 0013); Biome é um binário único (Rust) que cobre lint e formatação, com boa afinidade ao ecossistema Bun e desempenho superior à dupla tradicional ESLint + Prettier (dois processos, configuração duplicada).

## Decisão
**Biome** para lint e formatação do frontend, substituindo a combinação ESLint + Prettier.

## Consequências
- Uma configuração só (`biome.json`) em vez de duas ferramentas com regras potencialmente conflitantes.
- Execução mais rápida, relevante para rodar em cada commit/CI sem atrito perceptível.
- Menor maturidade de plugins de nicho comparado ao ecossistema ESLint (que tem plugins para praticamente qualquer biblioteca) — aceito conscientemente; se uma regra de lint específica de alguma biblioteca do stack (ex.: regras de hooks do React) não estiver coberta pelo Biome, isso deve ser avaliado pontualmente, não motivo para reverter a decisão geral.
