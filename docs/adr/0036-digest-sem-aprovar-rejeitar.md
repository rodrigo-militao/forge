# ADR 0036: Digest sem aprovar/rejeitar — seleção direta para edição + soft delete (supera ADR 0033)

## Status
Aceito (supera o modelo de "pool de aprovados" da ADR 0033; ADR 0029 permanece válida quanto à geração de rascunho pela IA)

## Contexto
O fluxo original (ADR 0005, ADR 0029, ADR 0033) tratava artigos do Digest com um gate de aprovação humana (aprovado/rejeitado) antes de entrarem no pool elegível para uma edição. Na prática, esse gate se mostrou um passo extra desnecessário: o fundador quer que todo artigo descoberto já seja diretamente selecionável para "Assemble Edition", sem uma etapa separada de aprovar/rejeitar. A necessidade real de "tirar da vista" um artigo indesejado é resolvida por um botão de deletar (soft-hide), não por um estado de rejeição formal.

## Decisão
- Artigos descobertos no Digest **não têm mais estado aprovado/rejeitado**. Ficam visíveis e selecionáveis por padrão assim que descobertos.
- Botão **"Deletar"** em cada artigo: soft-delete (`deleted_at` timestamp), não remove o registro do banco. Artigo deletado some da tela principal do Digest.
- Artigos deletados ficam acessíveis na **Library**, via filtro explícito ("mostrar deletados") — não aparecem por padrão em nenhuma lista.
- Tela de montagem de edição ("Assemble Edition"): mostra artigos **não deletados e ainda não usados em uma edição anterior** (mantendo essa parte da lógica da ADR 0033 — evita reusar sem querer o mesmo artigo em duas edições). O usuário seleciona (checkbox) quais entram na edição atual.
- A geração de rascunho de introdução/resumo pela IA a partir da seleção do usuário (ADR 0029) continua igual — só muda o que alimenta o pool de seleção.

## Migração de dados existentes
Para tenants que já têm artigos com o antigo status aprovado/rejeitado (implementado antes desta ADR):
- Itens com status "rejeitado" → migrar para `deleted_at` preenchido (soft-deletados).
- Itens com status "aprovado" ou "pendente" → migrar para `deleted_at` nulo (visíveis/selecionáveis).
- A IA implementadora deve inspecionar o schema real antes de escrever a migration, já que os nomes de campo podem divergir do que está documentado aqui.

## Consequências
- Simplifica a interação do usuário no dia a dia: menos cliques, menos estados para entender.
- Remove a necessidade de UI de "aprovar/rejeitar" item a item — a seleção acontece uma vez, no momento de montar a edição.
- Reduz o escopo da ADR 0033 ao comportamento de exclusão pós-uso em edição; a parte de "aprovado" dela fica obsoleta.
- Deduplicação de URL (não trazer o mesmo artigo duas vezes na descoberta) e categorização/tags (ver ADR 0037) operam sobre esse mesmo conjunto de artigos, independente do antigo gate de aprovação.
