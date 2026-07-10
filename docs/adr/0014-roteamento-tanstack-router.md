# ADR 0014: Roteamento — TanStack Router

## Status
Aceito

## Contexto
A SPA precisa navegar entre os domínios já definidos (Digest, Compose, Library, Settings, Auth — ver ADR 0012). O stack já adotou TanStack Query (ADR 0010); manter a mesma família de bibliotecas reduz superfícies de API diferentes que a IA implementadora precisa aprender.

## Decisão
**TanStack Router** em vez de React Router. Motivos:
- Tipagem de rotas forte (erros de path pegos em tempo de compilação, não em runtime) — reduz risco de erro de implementação por IA.
- Integração nativa com TanStack Query (loaders de rota podem prefetch dados via query), evitando lógica de carregamento duplicada entre roteamento e estado de servidor.

## Consequências
- Cada domínio em `features/` expõe suas próprias rotas, registradas centralmente em `app/` (ver ADR 0012).
- Rotas devem usar lazy loading por feature (`React.lazy` ou o mecanismo equivalente do TanStack Router) para code-splitting, contribuindo para a meta de performance de carregamento inicial (ADR 0010).
