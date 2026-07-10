# ADR 0002: Multi-tenancy desde o schema inicial, mesmo com poucos usuários

## Status
Aceito

## Contexto
Os dois CLIs atuais são mono-tenant (config e credenciais de uma única pessoa/organização). O objetivo é transformar isso em SaaS, inicialmente para uso próprio + amigos, mas com intenção real de abrir para mais usuários depois.

## Decisão
Desde o primeiro schema de banco de dados, toda tabela relevante carrega `user_id` (tenant). Não existe modo "single-user" implícito — mesmo o uso pessoal do fundador passa pela mesma modelagem de tenant que qualquer outro usuário.

Isso é mais caro agora do que gambiarrear um sistema mono-tenant, mas evita uma migração dolorosa de dados e de lógica de autorização quando o segundo usuário real aparecer.

## Consequências
- Toda query de leitura/escrita precisa filtrar por `user_id` desde o dia 1 — isso é regra de arquitetura, não detalhe de implementação.
- O controle de "plano ativo/inativo" (ADR 0008) já nasce por tenant.
- Isolamento de configuração por tenant: fontes de notícia, tópicos, vozes, tudo é por `user_id`.
- Não há isolamento de infraestrutura por tenant no MVP (todos os tenants compartilham o mesmo processo/VPS/banco) — isso é aceitável na escala de "alguns amigos".
