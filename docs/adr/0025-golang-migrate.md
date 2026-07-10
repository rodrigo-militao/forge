# ADR 0025: golang-migrate para migrations de banco

## Status
Aceito

## Contexto
O Passo 3 do plano já mencionava migrations versionadas sem formalizar a ferramenta. Precisávamos confirmar uma escolha simples, compatível com Docker, sem exigir sofisticação desproporcional à escala do projeto.

## Decisão
**golang-migrate**: arquivos SQL versionados (`000001_create_users.up.sql` / `.down.sql`), executado como binário CLI independente, integrado ao `docker-compose` como um passo de inicialização.

## Consequências
- Migrations ficam explícitas em SQL puro, revisáveis, sem abstração de ORM escondendo o schema real.
- Nenhuma sofisticação adicional (ex.: migration tooling específico de algum framework) é necessária nesta escala.
