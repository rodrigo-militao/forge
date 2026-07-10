# ADR 0006: Backend em VPS dockerizada (não serverless); frontend em Cloudflare Pages

## Status
Aceito

## Contexto
Objetivo explícito de economia de custo no início. O backend precisa rodar cron jobs (curadoria diária, geração de artigos) além de servir API multi-tenant com banco de dados persistente. Serverless (Railway, Fly.io, Render free tier) reduziria a operação, mas adiciona dependência de plataforma e complica execução de jobs agendados de forma confiável.

## Decisão
- **Frontend**: Cloudflare Pages (gratuito, estático/SPA).
- **Backend**: VPS pequena (ex.: Hetzner CX22 ou equivalente, ~€4-5/mês), rodando:
  - API Go
  - Postgres
  - Cron jobs nativos (ou scheduler interno em Go)
- **Tudo dockerizado** (backend, banco, workers) desde o início, mesmo rodando localmente no MVP, para permitir troca de provedor/cloud depois sem fricção — o mesmo `docker-compose` que roda local sobe na VPS.

## Consequências
- Mais controle e previsibilidade de custo do que serverless, ao preço de o fundador ser responsável por: atualizações de SO, backup do Postgres, hardening básico de segurança (firewall, SSH key-only, fail2ban), e monitoramento de disponibilidade — nada disso é automático numa VPS crua.
- Portabilidade alta: como tudo é container, migrar de Hetzner para outro provedor é troca de host, não reescrita.
- MVP local roda com o mesmo `docker-compose.yml` que será usado em produção — elimina a categoria de bug "funciona local, quebra no deploy".
