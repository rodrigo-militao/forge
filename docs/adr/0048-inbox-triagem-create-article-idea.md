# ADR 0048: Inbox — conceito de triagem dentro do Discover, com duas ações novas

## Status
Aceito

## Contexto
"Inbox" não é uma página nova — a própria navegação recomendada no documento de visão não a lista como item de menu separado. É o conceito de "itens descobertos ainda não decididos", que já existe na prática como a aba/filtro de itens não processados na tela do Discover (ex-Digest). O que falta são duas ações de triagem que hoje não existem: transformar um item descoberto diretamente em Article ou em Idea.

## Decisão
Nenhuma página nova. Cada item na tela do Discover ganha duas ações rápidas novas, além das já existentes (adicionar à newsletter — ADR 0043 — e soft-delete/ignorar — ADR 0036):

- **"Create Article"**: cria um novo Article (Compose) com o link do item descoberto como referência e o título como sugestão inicial — abre o fluxo de criação de artigo já existente (ADR 0030), pré-preenchido, no modo "Gerar com IA" (usando o item como contexto/referência) por padrão, com opção de trocar para "Começar em branco".
- **"Create Idea"**: cria uma nova Idea (ADR 0049) pré-preenchida com título e uma referência ao link do item descoberto.

## Consequências
- `digest_articles` (nome interno mantido, ADR 0047) ganha rastreabilidade opcional: `generated_content.source_digest_article_id` (nullable) e `ideas.source_digest_article_id` (nullable), para saber que um artigo/ideia teve origem numa descoberta específica — não obrigatório, só quando criado via essa ação.
- Não altera o comportamento de "Adicionar à newsletter" nem o soft-delete já existentes — são ações adicionais, não substituições.
