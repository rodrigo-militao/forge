# ADR 0052: Modo Escrita vs. Modo Gestão + refinamento de restrição visual (amenda o DESIGN.md)

## Status
Aceito

## Contexto
O `DESIGN.md` já existente é sólido (One Voice Rule, tonal layering, sem gradiente/glassmorphism). Mas a implementação vem se distanciando dele conforme features foram adicionadas rápido — pills coloridas de categoria/tag em toda parte, cards em vez de linhas em listas densas, e (erro deste processo, não do fundador) uma borda de acento à esquerda em card selecionado no prompt do Discover, que viola a regra já escrita no próprio `DESIGN.md` ("Don't use border-left greater than 1px as a colored accent stripe").

Comparando com Notion/Obsidian: a tela de escrita e a tela de gestão de conteúdo não devem competir pela mesma linguagem visual — a primeira precisa de silêncio quase total, a segunda pode ter densidade de dado, desde que ainda restrita.

## Decisão

**Princípio novo — dois modos:**
- **Modo Escrita** (editor de Article, Newsletter): chrome mínimo. Sem sidebar de navegação completa, sem badge, sem card. Metadado (contagem de palavras, status, data) fica num cabeçalho discreto (texto pequeno, cinza) e/ou um painel lateral colapsável, **fechado por padrão**, aberto sob demanda.
- **Modo Gestão** (Discover, Library, Articles/Newsletters/Ideas em lista, Settings): pode mostrar densidade de dado (contagem, data, status), mas ainda dentro da One Voice Rule já existente.

**Amendas concretas ao `DESIGN.md`:**

1. **Sem pílula colorida para tag/categoria/status em contexto denso.** Renderizar como texto simples (`text-secondary`/`text-muted`), separado por `·`, não como badge com fundo colorido. Isso é mudança de estilo de componente, não muda o modelo de dado (ADR 0037/0041/0045 continuam válidas).
2. **Listas densas usam linhas com fio (hairline divider), não cards.** Card continua reservado para contexto onde faz sentido (ex.: painel de detalhe de um item selecionado), não para cada linha de uma lista.
3. **Corrigir a violação existente**: remover a borda de acento à esquerda em item selecionado (Discover) — o próprio `DESIGN.md` já proíbe isso. Usar mudança de cor de texto/leve tonal shift no lugar.
4. **Nav ativa = só cor de texto**, sem bloco de fundo colorido atrás do item (mais restrito que a redação atual do `DESIGN.md`, que ainda permite "brighter background + burnt orange text").
5. **Painel de metadado colapsável no editor**, fechado por padrão — onde vive contagem de artigos/data/status quando o usuário quiser ver, sem competir com a escrita.

## Consequências
- `DESIGN.md` do repositório precisa ser atualizado com essas 5 regras antes de qualquer correção de tela.
- Nenhuma mudança de schema — é inteiramente refinamento de camada visual.
- Abre uma rodada de auditoria de conformidade nas telas já implementadas (Discover, Articles/Compose, Newsletters, Library, Settings) contra essas regras + as que já existiam.
