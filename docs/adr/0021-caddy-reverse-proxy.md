# ADR 0021: Caddy como reverse proxy na VPS

## Status
Aceito

## Contexto
A VPS (ADR 0006) precisa de algo terminando TLS/HTTPS e roteando para o container da API Go. Como o frontend vive no Cloudflare Pages (não nesta VPS), o proxy só precisa cuidar de um único serviço.

## Decisão
**Caddy**, em vez de nginx ou Traefik.

- nginx exigiria configuração manual de certificado (certbot separado) e um arquivo de config a manter sincronizado manualmente.
- Traefik brilha com múltiplos serviços dinâmicos descobertos via labels do Docker — poder desproporcional para rotear um único serviço.
- Caddy resolve HTTPS automático via Let's Encrypt sem configuração manual, com um `Caddyfile` de poucas linhas suficiente para "domínio → porta do container da API".

## Consequências
- Menor esforço de manutenção de certificado/config na VPS.
- Se o número de serviços expostos crescer significativamente no futuro (múltiplos backends, serviços internos), reavaliar se Traefik passa a compensar — decisão futura, não implícita aqui.
