# ADR 0022: Sem Redis no MVP

## Status
Aceito

## Contexto
Redis resolveria dois problemas potenciais: cache de leitura frequente e contadores/rate-limiting rápidos (relevante para a quota por tenant da ADR 0008/Passo 8). Nenhum dos dois é um problema real na escala atual do MVP (fundador + poucos amigos, poucos tenants, poucas gerações por dia).

## Decisão
Não introduzir Redis no MVP.
- **Rate limiting/quota por tenant**: resolvido com uma tabela simples no próprio Postgres (`usage_counters`, incrementada a cada geração, checada antes de permitir a próxima).
- **Cache de leitura**: no volume de dados do MVP, queries Postgres bem indexadas não serão gargalo.

## Consequências
- Um processo a menos para monitorar e consumir RAM na VPS enxuta.
- Revisitar esta decisão **quando** o número de tenants ativos crescer a ponto de a contagem de quota via Postgres virar gargalo real (decisão orientada por dado observado, não por precaução antecipada) — não é uma proibição permanente, é um adiamento consciente.
