# ADR 0001: Dois produtos sobre um núcleo compartilhado (não uma fusão total)

## Status
Aceito

## Contexto
Existem dois CLIs em Go já funcionais:
- **Newsletter Assistant** (ex-"agente Akme"): varre a internet por artigos/notícias, o usuário aprova o que entra na newsletter semanal. Curadoria, não geração.
- **Content Editor** (ex-"blog autônomo"): gera tópico (ou recebe um tópico específico) e escreve o artigo do zero, com roteamento de 4 vozes (Confessional, Clean Technical, Framework, Essay-manifesto).

A tentação inicial era "fundir" os dois serviços em um só. Na prática, os fluxos são diferentes o suficiente (curadoria+aprovação vs. geração autônoma) para continuarem como produtos distintos do ponto de vista do usuário.

## Decisão
Os dois CLIs viram **dois produtos dentro da mesma plataforma SaaS**, compartilhando um núcleo técnico comum:

**Núcleo compartilhado (a extrair dos 2 CLIs):**
- Orquestração de chamadas LLM (prompt building, parsing de resposta, retries)
- Persistência (conteúdo gerado, fontes, metadados)
- Modelo de tenant/usuário
- Fila/execução agendada (cron)

**O que diverge e fica em cada produto:**
- Newsletter Assistant: pipeline de busca de fontes → ranking → fila de aprovação → montagem da newsletter
- Content Editor: Topic Generator → roteamento de voz → geração de artigo → draft para revisão

## Consequências
- Menos retrabalho: o núcleo é escrito uma vez, testado uma vez.
- Os dois produtos podem evoluir em velocidades diferentes sem quebrar um ao outro.
- Exige um passo explícito de auditoria dos 2 CLIs atuais para identificar o que já é reaproveitável como núcleo vs. o que é específico de cada produto (ver plano, Passo 1).

## Alternativas consideradas
- **Fusão total num único fluxo configurável**: rejeitada por enquanto — os fluxos de aprovação humana são diferentes o suficiente (curadoria de terceiros vs. autoria original da IA) que forçar um único pipeline geraria complexidade desnecessária no MVP.
