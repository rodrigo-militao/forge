# ADR 0043: Digest — enviar artigo pra newsletter, individual ou em lote (refina ADR 0036/0040)

## Status
Aceito

## Contexto
Com a ADR 0042 (múltiplas newsletters em rascunho simultâneas), o antigo fluxo de "selecionar vários e montar uma edição" (ADR 0033) precisa virar "selecionar um ou vários artigos e mandar pra uma newsletter específica" — mantendo as duas formas de interação (item a item e em lote), conforme confirmado pelo fundador.

## Decisão

**Duas ações equivalentes no Digest, ambas com o mesmo destino (escolher uma newsletter):**
1. **Individual**: cada artigo ganha uma ação rápida "+ Newsletter", abrindo um seletor com as newsletters em rascunho existentes + opção "criar nova".
2. **Em lote**: seleção múltipla (checkbox, já existente da ADR 0033/0036) + botão "Adicionar à newsletter", mesmo seletor de destino, aplicado a todos os selecionados de uma vez.

Ambas apenas **inserem o artigo como item vinculado à newsletter escolhida** (texto + link) — não disparam geração de IA automaticamente. A geração de introdução/resumo é uma ação separada, dentro do editor da newsletter (ADR 0042).

**Relação muitos-para-muitos**: um artigo pode ser adicionado a mais de uma newsletter (útil dado que várias newsletters podem estar em andamento ao mesmo tempo). Tabela de junção: `newsletter_articles` (`newsletter_id`, `digest_article_id`, `added_at`).

**Visibilidade no Digest (mantém ADR 0040)**: um artigo já adicionado a pelo menos uma newsletter fica oculto por padrão na tela principal do Digest; o toggle "mostrar já enviados" continua revelando-os, permitindo adicioná-los a outra newsletter também.

## Consequências
- Remove o antigo botão único "Assemble Edition" que fazia seleção + geração de rascunho em um só passo — vira duas ações distintas e mais flexíveis (adicionar itens; gerar introdução quando quiser).
- A IA implementadora deve verificar se `newsletter_edition_items` (criada na implementação da ADR 0029/0033) já existe — nesse caso, avaliar se basta renomear/estender para `newsletter_articles`, ou criar a nova mantendo a antiga para não quebrar dado existente. Avisar antes de decidir.
