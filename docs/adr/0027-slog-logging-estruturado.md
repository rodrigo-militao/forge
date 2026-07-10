# ADR 0027: log/slog (standard library) para logging estruturado, sem ferramenta externa de observabilidade

## Status
Aceito

## Contexto
Não há orçamento nem prioridade para investir em observabilidade paga (Datadog, Grafana Cloud, etc.) no MVP, mas é desejável já ter boas práticas de log estruturado, com rastreabilidade de requisição, para não precisar retrabalhar isso depois.

## Decisão
**`log/slog`**, disponível na standard library do Go desde 1.21 — sem dependência externa.

- Middleware HTTP gera um `request_id` (UUID) por requisição, propagado via `context.Context`.
- Todo log dentro do fluxo de uma requisição inclui `request_id` como campo estruturado (JSON), permitindo filtrar todos os logs de uma requisição específica.
- Log estruturado de início/fim de requisição com duração e status (ex.: `slog.Info("request completed", "request_id", id, "duration_ms", d, "status", code)`).
- Acesso aos logs na VPS via `docker compose logs -f <serviço>` — sem infraestrutura extra.

## Consequências
- Zero custo de ferramenta externa no MVP, mantendo a disciplina de campos estruturados (request_id, e futuramente tenant_id) desde o início.
- Quando/se observabilidade paga (OpenTelemetry, Grafana, etc.) for adicionada no futuro, os logs estruturados do `slog` migram bem — a disciplina de campos já existe, não é retrabalho.
