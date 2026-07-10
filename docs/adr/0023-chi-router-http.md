# ADR 0023: chi como router HTTP

## Status
Aceito

## Contexto
Entre chi, echo, gin e fiber, as diferenças de performance pura são desprezíveis na escala deste produto. O critério decisivo é o encaixe com a arquitetura hexagonal (ADR anterior de padrões de código do backend): o handler HTTP deve ser uma casca fina que traduz request → caso de uso → response, sem lógica de negócio.

## Decisão
**chi** como router HTTP.
- É apenas um router sobre `net/http` puro — sem "mágica" de binding automático, renderização ou hooks que incentivem lógica no handler.
- Echo e Gin trazem bastante framework embutido que empurra na direção contrária (lógica vazando pro handler).
- Fiber foi descartado por ser baseado em `fasthttp`, não `net/http`, quebrando compatibilidade com boa parte do ecossistema Go padrão (middlewares, bibliotecas de observabilidade).

## Consequências
- Handlers HTTP ficam finos por padrão, reforçando a regra de dependência do hexagonal (ADR de padrões de código): `adapters/http/` chama `application/`, nunca contém lógica de domínio.
- Compatibilidade total com o ecossistema `net/http` padrão para qualquer middleware futuro (logging, request ID, etc.).
