# ADR 0016: Atualização de conteúdo novo via polling (não WebSocket/SSE no MVP)

## Status
Substituída pela ADR 0031 (SSE via Postgres LISTEN/NOTIFY). Mantida aqui como registro histórico da decisão original e do motivo da mudança.

## Contexto
Os dois produtos rodam em cron no backend (curadoria diária do Digest, geração de artigo no Compose). Quando um draft novo fica pronto, o frontend precisa refletir isso na fila de revisão sem o usuário precisar atualizar a página manualmente. WebSocket ou Server-Sent Events resolveriam isso em tempo real, mas são complexidade adicional (conexão persistente, reconexão, estado de servidor) desproporcional ao estágio do MVP.

## Decisão
Polling leve via TanStack Query (`refetchInterval`, ordem de 30-60 segundos) nas telas onde conteúdo novo pode aparecer (fila de aprovação do Digest, lista de drafts do Compose). Sem WebSocket, sem SSE, sem infraestrutura de tempo real no MVP.

## Consequências
- Atraso de até a janela de polling (ex.: até 60s) entre o conteúdo ficar pronto no backend e aparecer na tela — aceitável dado que a geração em si já roda em cron diário/agendado, não é um evento que exige reação instantânea do usuário.
- Simplicidade operacional: nenhuma conexão persistente para gerenciar, nenhum código de reconexão.
- Se o produto evoluir para exigir atualização em tempo real (ex.: colaboração simultânea entre usuários), isso é uma decisão nova e separada — não implícita nesta ADR.
