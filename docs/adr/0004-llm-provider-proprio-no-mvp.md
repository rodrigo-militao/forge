# ADR 0004: Provedor de LLM próprio no MVP; "traga sua própria key" fica para depois

## Status
Aceito

## Contexto
Há duas formas possíveis de custear as chamadas de LLM num SaaS multi-tenant:
1. A plataforma usa sua própria API key e absorve o custo no preço da assinatura.
2. O usuário conecta sua própria API key (Claude, ChatGPT, etc.) e paga o custo de uso diretamente ao provedor.

O plano final do produto quer oferecer as duas opções (a segunda como plano mais barato), mas isso exige gestão de credenciais de terceiros por tenant, seleção de provedor por tenant, e tratamento de erros específico por provedor.

## Decisão
No MVP, apenas a opção 1 é implementada: a plataforma usa seu próprio provedor de LLM para todos os tenants. Não há seleção de modelo nem "traga sua própria key" nesta fase.

## Consequências
- Simplifica a integração LLM para uma única implementação (um cliente, um formato de resposta a tratar).
- Exige rate-limiting/quota por tenant desde o MVP, porque o custo de LLM agora é do fundador, não do usuário (ver Passo 8 do plano).
- "Traga sua própria key" é uma extensão natural pós-MVP: quando implementada, deve reaproveitar a mesma interface de orquestração LLM do núcleo (ADR 0001), trocando apenas a credencial e o provedor usados.
