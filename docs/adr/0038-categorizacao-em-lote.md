# ADR 0038: Categorização de artigos em lote, com modelo mais barato (amenda à ADR 0037)

## Status
Aceito (amenda à ADR 0037)

## Contexto
A ADR 0037 previa sugestão de categoria por IA "no momento da descoberta", o que implicava uma chamada LLM por artigo descoberto — um custo que escala com volume de descoberta (controlado pelo cron), não com ação ativa do usuário, diferente de todas as outras chamadas LLM do sistema até aqui.

## Decisão

**Processamento em lote, assíncrono, no worker**: após um ciclo de descoberta do Digest (ADR 0026) inserir artigos novos, o worker agrupa os artigos ainda sem categoria (ex.: lotes de 10-20) e faz **uma chamada LLM por lote**, não uma por artigo, pedindo categoria para todos de uma vez (resposta estruturada, categoria mapeada por artigo). Não bloqueia a exibição dos artigos — eles aparecem sem categoria e são atualizados em seguida via o mesmo canal SSE já existente (ADR 0031).

**Modelo mais barato**: a chamada de categorização usa um modelo mais leve do mesmo provedor já definido (ADR 0004) — não é uma exceção à decisão de "provedor único", é uma escolha de modelo dentro do mesmo provedor, reservando o modelo mais caro/capaz para geração de artigo e newsletter (tarefas que exigem mais qualidade de texto).

**Vocabulário fechado quando possível**: o prompt de categorização inclui a lista de categorias já usadas pelo tenant, instruindo o modelo a preferir reutilizar uma existente; só propor categoria nova quando nenhuma da lista servir. Reduz tamanho do prompt e evita proliferação de categorias quase-duplicadas.

## Consequências
- Reutiliza a fila assíncrona já existente (ADR 0028) — o job de categorização em lote pode ser um `type` novo na tabela `jobs`, seguindo o mesmo padrão de retry/observabilidade dos outros jobs.
- Custo de LLM para categorização passa a escalar com número de lotes, não com número de artigos — previsível e baixo.
- Pequeno atraso entre o artigo aparecer e a categoria ser preenchida (aceitável, já que categoria é auxiliar de organização, não bloqueia nenhuma ação do usuário).
