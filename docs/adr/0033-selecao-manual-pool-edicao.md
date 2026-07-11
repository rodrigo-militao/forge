# ADR 0033: Montagem de edição com seleção manual do pool de aprovados (amenda à ADR 0029)

## Status
Aceito (refina ADR 0029)

## Contexto
A ADR 0029 previa a IA selecionar automaticamente todos os artigos aprovados pendentes ao montar uma edição. Ao detalhar a experiência com o fundador, ficou claro que o fluxo real é: aprovar um artigo no Digest só o torna elegível para o pool; a escolha de quais itens entram em uma edição específica é manual, feita pelo usuário na tela de montagem.

## Decisão
- **Pool de aprovados**: artigos com status aprovado E ainda não incluídos em nenhuma edição anterior (via `newsletter_edition_items`, ADR 0029).
- **Reprovados nunca aparecem** nessa tela por padrão — só visíveis se o usuário filtrar explicitamente por reprovados em outra busca/tela.
- **Ao iniciar uma newsletter**: a tela mostra o pool de aprovados-e-não-usados; o usuário marca (checkbox) quais itens quer incluir nesta edição.
- A partir da seleção feita pelo usuário (não de todo o pool automaticamente), a IA gera o rascunho de introdução/resumo (mantendo o restante da ADR 0029: sempre editável, revisão humana obrigatória).
- Um item aprovado, uma vez incluído em uma edição, sai do pool de "disponíveis" para novas edições (marcado via o relacionamento em `newsletter_edition_items`) — não aparece novamente por padrão.

## Consequências
- A tela de montagem de edição precisa listar o pool com seleção múltipla antes de disparar a geração do rascunho — isso é anterior à chamada ao `LLMClient`, não simultâneo.
- Reforça que "aprovar" e "incluir numa edição" continuam sendo o mesmo estado + uma ação de seleção subsequente, não dois estados/flags separados no schema.
- Se o produto precisar reutilizar um item aprovado em mais de uma edição no futuro (ex.: "grandes matérias" citadas de novo), isso é uma decisão nova — não coberta aqui.
