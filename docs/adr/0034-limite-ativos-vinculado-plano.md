# ADR 0034: Limite de sources/interesses ativos — campo já existente, vinculado a plano (amenda à ADR 0008)

## Status
Aceito (amenda à ADR 0008)

## Contexto
A ADR 0008 já definiu billing manual no MVP (`plano_ativo: bool`, controlado pelo fundador). Faltava decidir se o limite de sources/interesses ativos por tenant é uma restrição técnica (evitar sobrecarga de busca) ou já parte da diferenciação de plano. Confirmado com o fundador: é a segunda opção.

## Decisão
Adicionar campos numéricos de limite por tenant na mesma tabela `users` onde já vive `plano_ativo` (ADR 0008): `max_active_sources` e `max_active_interests` (ADR 0032). Controlados manualmente pelo fundador no MVP, mesmo padrão de `plano_ativo` — sem UI de billing, sem tiers formais ainda.

- Valor default razoável para o MVP (ex.: 10 sources ativas, 5 interesses ativos) — ajustável por tenant manualmente.
- A tela de Settings (fontes/interesses) deve bloquear ativação além do limite, com mensagem clara ao usuário.

## Consequências
- Prepara o terreno para tiers de plano reais no futuro (quando a estratégia de billing for definida, ADR 0008) sem exigir migração de schema nova — os campos já existem, só passam a ser setados por um fluxo de pagamento em vez de manualmente.
- Não introduz nenhuma lógica de cobrança agora — é só um limite numérico controlado à mão.
