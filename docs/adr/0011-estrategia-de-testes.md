# ADR 0011: Estratégia de testes — Poku para unitário, Playwright para componente e e2e

## Status
Aceito

## Contexto
Preferência explícita por Poku (test runner open source leve, Node/Bun/Deno, ao qual o fundador já contribui) para testes unitários. Poku não tem suporte nativo documentado para ambiente DOM (jsdom/happy-dom), o que o torna adequado para lógica pura, mas não para testes de componente React isolado.

## Decisão

**Testes unitários**: Poku. Escopo: funções utilitárias, validadores, lógica de hooks sem dependência de DOM, lógica de negócio isolada (ex.: roteamento de voz do Content Editor, regras de formatação), clientes de API mockados.

**Testes de componente e end-to-end**: Playwright, cobrindo ambos os níveis:
- Fluxos completos de usuário (login → configurar → gerar conteúdo → revisar → aprovar → exportar).
- Verificação de comportamento de componentes específicos quando necessário, dentro do contexto real da aplicação renderizada — em vez de montar componentes isolados com Testing Library/jsdom.

Não usar Vitest/Jest como camada intermediária de teste de componente — a cobertura desse nível fica inteiramente com Playwright.

## Consequências
- Menos ferramentas diferentes no projeto (dois test runners, não três), à custa de não ter testes de componente "unitários" no sentido estrito (renderizar um componente fora do app inteiro) — aceito conscientemente.
- Testes de e2e/componente via Playwright são mais lentos que testes unitários puros; a suíte de CI deve rodar Poku em todo push e Playwright pelo menos antes de merge/deploy (a definir o gatilho exato no Passo de CI, se/quando existir).
- Backend Go usa seu próprio ecossistema de testes nativo (`testing` package, `testify` se necessário) — esta ADR cobre apenas a camada de frontend.
