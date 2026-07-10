# ADR 0018: Radix UI para primitivos de componentes acessíveis

## Status
Aceito

## Contexto
Tailwind CSS (ADR 0010) resolve estilo, mas não comportamento — foco de teclado, navegação por teclado, atributos ARIA corretos em modais, dropdowns, selects e tooltips. Implementar isso à mão (ou via IA, sem uma base testada) é uma fonte comum de bugs de acessibilidade e de UX (foco perdido, teclado não funcionando, leitor de tela quebrado).

## Decisão
**Radix UI** como biblioteca de primitivos não-estilizados para qualquer componente interativo complexo (modal, dropdown, select, tooltip, popover). O Tailwind é aplicado por cima dos primitivos do Radix para estilo, seguindo os tokens do `docs/design-system.md`.

## Consequências
- Componentes de `shared/` que envolvem interação complexa (ADR 0012) devem ser construídos sobre primitivos Radix, não implementados do zero.
- Radix não impõe estilo visual próprio, então não há conflito com a identidade visual já definida — só fornece o comportamento.
- Reduz risco de bugs de acessibilidade que seriam difíceis de detectar sem teste manual dedicado de teclado/leitor de tela.
