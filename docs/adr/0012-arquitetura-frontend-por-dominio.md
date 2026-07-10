# ADR 0012: Arquitetura de frontend organizada por domínio (feature-based)

## Status
Aceito

## Contexto
O fundador pediu uma arquitetura "robusta e simples" que aplique princípios de DDD e facilite componentização, dado que a implementação será majoritariamente feita por IA, um módulo de cada vez.

## Decisão
Pastas organizadas por domínio/feature (variação de Feature-Sliced Design), espelhando os bounded contexts já definidos no produto (ver `docs/design-system.md`, seção de nomenclatura de módulos):

```
src/
├── features/
│   ├── digest/       (newsletter — descobrir, aprovar, montar)
│   ├── compose/      (editor de artigo — tópico, voz, draft)
│   ├── library/      (histórico de conteúdo aprovado)
│   ├── settings/      (fontes, tópicos, config, idioma)
│   └── auth/          (login)
├── shared/            (design system: botões, badges, tokens)
└── app/               (roteamento, providers globais)
```

Cada pasta em `features/` é autocontida: componentes, hooks, chamadas de API e testes específicos daquele domínio vivem juntos, em vez de espalhados por pastas técnicas genéricas (`components/`, `hooks/`, `utils/`) compartilhadas entre todos os domínios.

`shared/` contém apenas o que é genuinamente reutilizável entre domínios (tokens do design system, componentes base como botão/badge/card).

## Consequências
- Uma IA implementando o Passo 7 do plano pode trabalhar em `features/compose/` sem precisar entender ou tocar em `features/digest/` — reduz risco de regressão cruzada.
- Facilita code-splitting por rota/feature (lazy loading), contribuindo para a meta de performance de carregamento inicial.
- Exige disciplina para não vazar lógica específica de um domínio para `shared/` — se algo parece reutilizável mas só é usado por um domínio hoje, fica no domínio até um segundo uso real aparecer.
