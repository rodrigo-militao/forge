# ADR 0028: Fila assíncrona via tabela `jobs` no Postgres (sem broker de mensagens)

## Status
Aceito

## Contexto
Ações do usuário que disparam chamadas LLM (ex.: "gerar agora" no Compose) não devem bloquear a requisição HTTP esperando a resposta do LLM, que pode levar vários segundos. Um message broker de verdade (Kafka, RabbitMQ, NATS) resolveria isso, mas exige múltiplos consumidores independentes, alto throughput ou garantias de ordenação distribuída para justificar sua complexidade — nenhuma dessas condições existe na escala atual (fundador + poucos usuários).

## Decisão
Fila implementada como uma tabela `jobs` no próprio Postgres:
- Colunas mínimas: `id`, `user_id`, `type` (ex.: `generate_article`, `curate_digest`), `status` (`pending` / `processing` / `done` / `failed`), `payload` (JSONB), `created_at`, `updated_at`, `error` (nullable).
- A API, ao receber uma ação assíncrona, apenas insere uma linha em `jobs` e responde `202 Accepted` com o `job_id` — não espera o processamento.
- O worker (mesmo container do cron, ADR 0026) faz polling na tabela usando `SELECT ... FOR UPDATE SKIP LOCKED` para pegar o próximo job pendente sem risco de dois workers processarem o mesmo job simultaneamente.
- O frontend descobre o resultado via o mesmo polling já definido na ADR 0016 (TanStack Query `refetchInterval`), consultando o status do `job_id`.

## Consequências
- Separação real entre API (responde rápido) e processamento pesado (worker), sem adicionar nenhum serviço de infraestrutura novo — reaproveita Postgres e o worker já decididos.
- `SELECT FOR UPDATE SKIP LOCKED` é um padrão nativo e bem estabelecido do Postgres para fila, evitando processamento duplicado mesmo com mais de um worker rodando no futuro.
- Se o volume de jobs crescer a ponto de exigir throughput maior ou múltiplos workers concorrentes de forma intensa, reavaliar um broker dedicado (ex.: NATS) — decisão futura orientada por dado observado, não antecipada agora.
