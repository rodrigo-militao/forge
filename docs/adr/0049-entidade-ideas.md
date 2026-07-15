# ADR 0049: Entidade Ideas — backlog editorial

## Status
Aceito

## Contexto
Profissionais técnicos frequentemente têm mais ideias do que conseguem desenvolver. O Forge precisa de um lugar para capturar, organizar e evoluir essas ideias antes (ou sem nunca) virarem artigo.

## Decisão

**Tabela `ideas`**: `id`, `user_id`, `title`, `context` (texto livre), `notes` (texto livre), `references` (texto livre, links soltos — não normalizado em tabela própria, simplicidade sobre completude neste estágio), `status`, `priority`, `source_digest_article_id` (nullable, ver ADR 0048), `created_at`, `updated_at`.

**Status da Idea** (ciclo de vida da própria ideia, distinto do status do artigo que ela pode gerar): `open` (ainda só ideia), `in_progress` (sendo desenvolvida em artigo), `used` (já virou pelo menos um artigo), `archived` (abandonada).

**Priority**: enum simples de 3 níveis — `low`, `medium`, `high`.

**Tags**: reaproveita o vocabulário único do tenant (ADR 0041), via nova junção `idea_tags`.

**Relação com artigos**: `idea_articles` (junção `idea_id` + `generated_content_id`) — muitos-para-muitos, já que uma ideia pode gerar mais de um artigo ao longo do tempo (ex.: diferentes ângulos do mesmo tema).

**Relação com newsletter**: rastreada indiretamente — se um artigo originado de uma ideia for incluído numa newsletter (`newsletter_articles`... na verdade artigos de Compose não passam por essa tabela, que é específica de artigos do Discover; a relação newsletter↔artigo do Compose seria via o corpo da newsletter referenciando o artigo, não uma tabela de junção nova nesta ADR — deixar como está, sem nova estrutura aqui).

**Evolução Idea → Article**: a partir de uma Idea, o usuário pode iniciar a criação de um Article (mesmo fluxo do botão global `+ Create`, ADR 0051, pré-preenchido com título/contexto da Idea), que passa pelo fluxo normal de criação incluindo o Outline (ADR 0050). Ao gerar o artigo, o status da Idea pode ser atualizado manualmente para `in_progress`/`used` pelo usuário (não automático).

## Consequências
- Nova página dentro de "Content" (ADR 0051): lista de Ideas, com filtro por status/prioridade/tag.
- Idea não é obrigatória no fluxo — o usuário continua podendo criar um Article do zero, sem passar por Idea primeiro.
- Simplicidade deliberada no campo `references` (texto livre, não relacional) — se no futuro for necessário rastrear referências de forma estruturada, é uma extensão, não retrabalho.
