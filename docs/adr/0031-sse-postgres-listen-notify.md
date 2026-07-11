# ADR 0031: SSE (Server-Sent Events) via Postgres LISTEN/NOTIFY, substituindo o polling da ADR 0016

## Status
Aceito (substitui ADR 0016)

## Contexto
O polling simples definido na ADR 0016 se mostrou problemático na prática: geração de erros intermitentes ao consultar o banco repetidamente em intervalo fixo. A necessidade real (avisar o frontend quando um job termina ou conteúdo novo aparece) é 100% push unidirecional servidor→cliente — nunca o cliente precisa mandar dado de volta pela mesma conexão, o que torna WebSocket desnecessariamente complexo para o caso.

## Decisão
**Server-Sent Events (SSE)**, não WebSocket:
- SSE roda sobre HTTP puro, compatível com chi (ADR 0023) via `http.Flusher`, sem biblioteca extra de protocolo.
- `EventSource` no navegador já tem reconexão automática nativa — menos código no frontend do que gerenciar reconexão de WebSocket manualmente.
- WebSocket ficaria reservado para casos de comunicação bidirecional real (não existe esse caso hoje no produto).

**Como os eventos são disparados**: **Postgres `LISTEN`/`NOTIFY`**, não um broker externo.
- O worker (ADR 0026), ao concluir um job ou inserir conteúdo novo, executa `NOTIFY` no canal relevante.
- A API mantém uma conexão `LISTEN` nesse canal e repassa o evento para os clientes SSE conectados daquele tenant.
- Isso elimina o padrão de "consultar o banco repetidamente independente de mudança real" que causava os erros do polling, e mantém a decisão de não introduzir Redis/broker externo (ADR 0022) — Postgres já resolve.

## Consequências
- Endpoint SSE (ex.: `GET /api/events`) autenticado pelo mesmo cookie httpOnly (ADR 0017); atenção a `SameSite`/`Secure` já que frontend (Cloudflare Pages) e backend (VPS) vivem em domínios diferentes — mesmo cuidado já registrado na ADR 0017, agora também aplicado à conexão SSE.
- O canal de notificação deve ser escopado por tenant (ex.: incluir `user_id` no payload do `NOTIFY`, ou um canal por tenant) para a API não vazar evento de um tenant para outro.
- TanStack Query deixa de usar `refetchInterval` (ADR 0016) nas telas afetadas; passa a invalidar/atualizar cache reagindo ao evento SSE recebido.
- Base construída aqui (canal de notificação server-push) também serve de fundação para a futura funcionalidade de lembretes/notificações de montagem automática de edição (mencionada como fora de escopo na ADR 0029) — não é implementada agora, mas o mecanismo já fica pronto para isso quando for priorizado.
