# ADR 0029: Montagem de edição de newsletter — manual no MVP, rascunho gerado por IA, sempre editável

## Status
Aceito

## Contexto
O Passo 5 original definiu que artigos aprovados no Digest alimentam "a montagem da newsletter", sem detalhar o comportamento exato. Faltava decidir: (a) a montagem é automática (cron) ou sob demanda; (b) o resultado é um rascunho escrito pela IA ou uma simples compilação de links.

## Decisão

**Como monta**: ao acionar a montagem, a IA gera um rascunho automático (introdução + resumo dos artigos aprovados daquele lote), usando o mesmo `LLMClient` port já existente no núcleo (ADR 0001). Esse rascunho entra como `draft`, seguindo a mesma regra de revisão humana obrigatória da ADR 0005 — nunca é considerado final sem edição/aprovação do usuário, e é livremente editável (TipTap, ADR 0010) antes de exportar.

**Quando monta**: **botão manual** ("Montar edição") no MVP. O usuário decide quando os artigos aprovados acumulados até aquele momento devem virar uma edição. Nenhum agendamento automático de montagem no MVP.

## Consequências
- Schema: introduzir uma entidade de "edição de newsletter" (ex.: `newsletter_editions`) com um relacionamento para os itens aprovados que a compõem (ex.: `newsletter_edition_items`), e um campo de corpo (rascunho gerado, editável). A IA implementadora deve inspecionar o schema já existente (dado que Digest já está implementado) antes de criar migrations novas, para reconciliar nomes de tabela/campo já em uso em vez de assumir os nomes do plano original.
- **Fora de escopo desta ADR, adiado conscientemente**: montagem automática via cron com lembretes/notificações. Fica registrado como melhoria futura desejada pelo fundador, a ser tratada como decisão nova quando o MVP validar o fluxo manual — não implícita aqui.
- Exportação da edição montada continua manual (cópia/download), sem publicação automática (ADR 0003 permanece válida).
