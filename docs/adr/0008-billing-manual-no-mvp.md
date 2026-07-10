# ADR 0008: Billing real fica de fora do MVP; apenas flag manual de "plano ativo"

## Status
Aceito

## Contexto
Estratégia de billing (tiers, preço, eixos de diferenciação — volume, produto, provedor de IA) ainda não está definida e o fundador quer decidir isso com dados reais de uso do MVP, não antes.

## Decisão
O MVP não integra nenhum provedor de pagamento (Stripe, etc.) nem cobra ninguém. Cada tenant tem um campo simples `plano_ativo: bool` (ou enum `ativo/inativo`), controlado manualmente pelo fundador (via banco de dados diretamente ou uma tela admin mínima — a definir no passo de implementação).

## Consequências
- Elimina do MVP toda a complexidade de integração de pagamento, webhooks de cobrança, e gestão de ciclo de vida de assinatura.
- A definição da estratégia de billing (tiers, preço, eixos) é adiada para depois do MVP validado, como uma decisão separada e deliberada — não uma consequência acidental da arquitetura.
- Quando o billing real for implementado, o campo `plano_ativo` deve virar derivado do status de assinatura (ex.: de um provedor de pagamento), não ser removido — outras partes do sistema (rate-limiting, acesso a features) já devem checar esse campo desde o MVP.
