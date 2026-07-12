# ADR 0041: Tags como vocabulário único do tenant, aplicável a Digest e Compose/Newsletter (amplia ADR 0037)

## Status
Aceito (amplia o escopo da ADR 0037)

## Contexto
A ADR 0037 escopava tags apenas para artigos do Digest. Ao detalhar a experiência, ficou claro que tags devem se aplicar também a conteúdo do Compose e a edições de newsletter — qualquer coisa que o usuário edite deve poder ser marcada com as mesmas tags, com o botão de salvar mostrando todas as tags já criadas pelo tenant para reuso rápido. Confirmado: **sem tags default no banco** — só criação livre pelo usuário.

## Decisão
- Tabela `tags` (`id`, `user_id`, `label`) — vocabulário único por tenant, sem seed/default.
- Duas tabelas de junção separadas, sem polimorfismo (mantém integridade referencial real): `digest_article_tags` e `content_tags` (para `generated_content` — artigos do Compose e edições de newsletter), ambas referenciando a mesma `tags`.
- Qualquer tela de edição (Compose, edição de newsletter) mostra o campo de tags junto do botão de salvar, listando todas as tags já criadas pelo tenant para seleção rápida, com opção de criar uma nova ali mesmo.

## Consequências
- Um tenant novo começa sem nenhuma tag — a primeira tag só existe quando ele criar.
- Evita polimorfismo de tabela (`taggable_type`/`taggable_id`), preferindo duas junções explícitas — mais simples de manter integridade referencial no Postgres, ao custo de duplicar a estrutura da tabela de junção uma vez.
- Filtro por tag (Digest e Library, já pedido) opera sobre essas mesmas tabelas.
