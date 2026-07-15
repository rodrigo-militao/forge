# ADR 0046: Newsletters como "release" — status Building/Ready/Published/Archived (supera parte da ADR 0044)

## Status
Aceito (supera os valores de status da ADR 0044 especificamente para Newsletters; Compose mantém `draft`/`published`/`discarded` como estava)

## Contexto
O modelo binário `draft`/`published`/`discarded` (ADR 0044) não dava visibilidade de progresso — só "terminou ou não". Pensando no público técnico do Forge, o fundador propôs tratar cada newsletter como uma **release de software**, um mental model já familiar pro público-alvo, com um estado intermediário real de "conteúdo pronto, ainda não usado".

Este modelo se aplica **só a Newsletters**, não a artigos do Compose — "release" é uma metáfora que faz sentido pra uma coleção curada de conteúdo (a newsletter), não para uma peça de texto individual. Compose continua com o vocabulário `draft`/`published`/`discarded` da ADR 0044, sem mudança.

## Decisão

**Status de Newsletters** (`newsletters.status`), quatro valores:
- `building` (substituindo `draft`): em montagem, artigos ainda sendo adicionados.
- `ready` (novo — não existia antes): conteúdo travado, revisão feita, ainda não usada/exportada. **Transição manual** — o usuário clica algo como "Marcar como pronta", sem critério automático.
- `published` (mesmo significado da ADR 0044): marcação manual de "já usei/exportei isso" — continua sem nenhuma publicação automática real (ADR 0003 intocada).
- `archived` (substituindo `discarded`): release cancelada/arquivada.

**Campo `destination`** (novo, `newsletters.destination`): etiqueta livre (texto simples, não enum rígido), usada para organização/exibição — ex.: "Substack", "Newsletter interna", "Blog cliente X". Sugestões de preenchimento vêm dos templates de exportação já existentes (Substack/Markdown genérico/Texto simples) e de destinos já usados antes pelo tenant, mas o campo aceita qualquer valor livre. Ao exportar, se `destination` bater com um template conhecido, esse template vem pré-selecionado por padrão — sem travar a escolha, o usuário pode trocar pontualmente.

## Consequências
- Migration em `newsletters.status`: remapear `draft` → `building`, `published` → `published` (sem mudança), `discarded` → `archived`.
- A tela de Newsletters vira um dashboard de progresso, não uma lista de documentos: cada release mostra status, progresso (contagem de artigos incluídos via `newsletter_articles`), última atividade (`updated_at`), tópicos (reaproveitando `newsletter_tags`, ADR 0041/0042 — não agregado dos artigos internos), destino, e ações rápidas (Editar, Preview, Duplicar).
- **Duplicar**: clona título, destino e tags como uma nova release em `building`, **sem** copiar o corpo do texto nem os artigos vinculados — pensado pra formato recorrente (ex.: "Weekly Dev Digest" volta toda semana com a mesma estrutura, conteúdo novo). Se este não for o comportamento esperado, avisar antes de implementar.
- O seletor de "qual newsletter" no fluxo do Digest (ADR 0043) deve, por padrão, listar releases em `building` como destino válido para receber novos artigos — releases `ready`/`published`/`archived` não aparecem nesse seletor por padrão (reabrir isso é uma ação separada, não implícita aqui).
