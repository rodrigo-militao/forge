# ADR 0044: Status draft/published/discarded em Newsletters e Compose (amenda a ADR 0005)

## Status
Aceito (amenda a ADR 0005 quanto aos valores concretos do campo de status)

## Contexto
A ADR 0005 estabeleceu o princípio de revisão humana obrigatória, com um campo binário `draft`/`aprovado` em `generated_content` (Compose). O fundador quer um modelo de três estados, aplicado tanto a Compose quanto às novas Newsletters (ADR 0042): `draft` (rascunho), `published` (publicado) e `discarded` (descartado).

**Importante**: o princípio da ADR 0005 continua valendo integralmente — nada é publicado automaticamente em lugar nenhum (ADR 0003). "Published" aqui é uma marcação manual do usuário, o equivalente a dizer "terminei, já usei isso fora da plataforma" — não uma ação de publicação real disparada pelo sistema.

## Decisão
- `generated_content.status` (Compose) passa a aceitar `draft`, `published`, `discarded` — substituindo o par `draft`/`aprovado` anterior. Migração de dados: registros com status `aprovado` viram `published`.
- `newsletters.status` (ou `newsletter_editions.status`, conforme ADR 0042) usa os mesmos três valores.
- `discarded` é definido pelo próprio usuário (ação manual, tipo "arquivar"), não um estado automático.
- Este campo de status é **distinto e não relacionado** ao soft-delete (`deleted_at`) dos artigos do Digest (ADR 0036) — são conceitos diferentes, aplicados a entidades diferentes. Não confundir "artigo do Digest deletado" com "newsletter/artigo do Compose descartado".

## Consequências
- Migration em `generated_content` para remapear valores existentes de status.
- UI do Compose e de Newsletters precisa de um seletor/indicador visual de status, com as três opções.
- Nenhuma mudança na obrigatoriedade de revisão humana (ADR 0005) — o rótulo do estado terminal muda de "aprovado" para "publicado", o comportamento de exigir revisão antes de considerar pronto continua o mesmo.
