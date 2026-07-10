# ADR 0020: PostgreSQL como banco de dados

## Status
Aceito

## Contexto
Precisávamos confirmar o banco de dados para o MVP multi-tenant, avaliando adequação ao caso de uso (schema evolutivo, custo de VPS baixo, escala inicial de fundador + poucos usuários).

## Decisão
**PostgreSQL**, acessado via `pgx` (driver Go maduro e performático).

Motivos:
- JSONB permite flexibilidade em campos que ainda vão evoluir (config de roteamento de voz, metadados de tópico) sem exigir migration a cada ajuste, mantendo ACID.
- Escala do MVP (fundador + poucos usuários, depois alguns beta testers) está muito abaixo de qualquer cenário onde Postgres seria gargalo — não há motivo para considerar bancos distribuídos.
- Ecossistema Go maduro em torno do Postgres (pgx, sqlc — ver ADR 0024).

## Consequências
- **Row-Level Security (RLS)** nativo do Postgres fica registrado como melhoria futura de defesa em profundidade para multi-tenancy (além do filtro `user_id` na aplicação, ADR 0002) — não bloqueante para o MVP, mas barato de ativar depois e vale revisitar quando o número de tenants crescer.
- Nenhuma necessidade de sharding, replicação multi-região, ou banco distribuído neste estágio.
