# ADR 0042: Página "Newsletters" — múltiplos rascunhos simultâneos, cada um editável como artigo

## Status
Aceito (supera o modelo de montagem única da ADR 0029/0033)

## Contexto
O modelo original (ADR 0029/0033) previa "montar uma edição por vez": iniciar, selecionar pool de aprovados, gerar rascunho, revisar. Na prática, o fundador trabalha de forma mais contínua — vai lendo artigos do Digest ao longo do tempo e distribuindo entre newsletters que já estão em andamento, podendo ter várias em rascunho simultaneamente (ex.: já rascunhando a próxima edição enquanto ainda finaliza a atual).

## Decisão
Nova página de primeiro nível, **Newsletters**, ao lado de Digest/Compose/Library/Settings no design system.

- Lista todas as newsletters do tenant, com múltiplos rascunhos podendo existir ao mesmo tempo (sem limite).
- Cada newsletter é uma entidade editável como um artigo: título + corpo (TipTap), igual ao editor já usado no Compose.
- Categorizável (`category`) e tageável (mesmo padrão de tags da ADR 0041 — nova junção `newsletter_tags`).
- **Não existe entidade separada de "texto manual"** — a newsletter em si é o documento.
- A geração de introdução/resumo via IA (comportamento original da ADR 0029) passa a ser uma **ação disponível dentro do editor da newsletter** ("Gerar introdução com IA a partir dos itens incluídos"), não mais um gatilho único de "montar edição" — pode ser chamada a qualquer momento, inclusive de novo se novos itens forem adicionados depois.

## Schema
- Se a tabela `newsletter_editions` já existir no código (implementada antes desta ADR), **estender essa tabela** em vez de criar uma nova com nome diferente — adicionar `status`, `category`, e o que faltar. Renomear a tabela não é necessário e adiciona risco de migration sem ganho real.
- Se ainda não existir, criar como `newsletters` (nome mais adequado ao conceito atual de rascunhos persistentes, não "edições" montadas de uma vez).
- `newsletter_tags` (junção com `tags`, ADR 0041).
- Relação com artigos do Digest incluídos: ver ADR 0043 (mudança na forma como artigos entram na newsletter).

## Consequências
- A IA implementadora deve inspecionar o schema atual antes de decidir entre estender `newsletter_editions` ou criar `newsletters` — não duplicar.
- O conceito de "edição semanal" fica mais solto — nada impede o usuário de ter newsletters com cadência irregular, múltiplas em paralelo, etc. Isso é intencional.
