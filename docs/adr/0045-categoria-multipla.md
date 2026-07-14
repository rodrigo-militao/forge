# ADR 0045: Categoria vira múltipla por artigo (amenda à ADR 0037 e à ADR 0038)

## Status
Aceito (amenda ADR 0037 quanto à cardinalidade; amenda ADR 0038 quanto ao formato de resposta da IA)

## Contexto
A ADR 0037 definiu `category` como campo único por artigo. Ao desenhar a tela real do Digest, ficou claro que um artigo frequentemente se encaixa em mais de uma categoria (ex.: "Concurrency", "Systems", "Programming" simultaneamente), e o fundador confirmou que quer múltiplas categorias por artigo quando fizer sentido.

## Decisão
- `category` deixa de ser uma coluna única em texto e vira relação muitos-para-muitos: tabela `categories` (`id`, `user_id`, `label` — vocabulário por tenant, паралело à estrutura de `tags` da ADR 0041) + junção `article_categories` (`digest_article_id`, `category_id`).
- **Distinção que sobrevive entre categoria e tag**: categoria é sugerida pela IA (job de categorização em lote, ADR 0038); tag é 100% criada pelo usuário, sem IA. Cardinalidade agora é igual (ambas múltiplas) — a diferença é só a origem.
- O job de categorização em lote (ADR 0038) passa a retornar um **array de categorias por artigo**, não mais um valor único — ainda usando vocabulário fechado (reutilizar categorias já existentes do tenant quando possível), ainda em lote, ainda com modelo mais barato.
- Usuário pode editar o conjunto de categorias de um artigo (remover uma sugerida, adicionar outra já existente do vocabulário do tenant) — mesma UI de edição usada para tags, tratamento visual idêntico (badges), só populações de dados diferentes.

## Consequências
- Migration: se `category` já existe como coluna única em produção, migrar valores existentes para uma linha em `article_categories` cada, depois remover a coluna antiga.
- Filtro por categoria (Digest e Library, já decidido) passa a filtrar por "artigo tem pelo menos uma categoria X" em vez de "artigo.category = X".
- Prompt do job de categorização em lote (ADR 0038) precisa ser ajustado para pedir resposta em array, não valor único.
