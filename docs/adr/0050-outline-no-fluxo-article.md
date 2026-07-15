# ADR 0050: Etapa de Outline no fluxo "Gerar com IA" do Article (Compose)

## Status
Aceito

## Contexto
O fluxo atual de geração autônoma de artigo (ADR 0030, modo "Gerar com IA") vai direto de tema/tópico para artigo completo. A visão de produto propõe um checkpoint intermediário: gerar um outline (estrutura) primeiro, o usuário revisar/ajustar, e só depois gerar o rascunho completo — dá mais controle editorial sem exigir que o usuário escreva do zero.

## Decisão
No modo **"Gerar com IA"** do Article (Compose), o fluxo passa a ser:

```
Tema/Idea → Gerar Outline (IA) → Revisar Outline (usuário edita ou aprova como está) → Gerar Draft completo (IA, usando o outline aprovado) → Editor (TipTap) → Revisão → Publicado
```

- Outline armazenado em `generated_content.outline` (texto/JSON simples — lista de seções/tópicos), gerado via `LLMClient` já existente.
- **Não é um gate bloqueante**: o usuário pode seguir direto para "Gerar Draft" sem editar o outline, ou pular a revisão explícita — a etapa existe, mas não trava o fluxo se o usuário só quiser confirmar rapidamente.
- O modo **"Começar em branco"** (ADR 0030) não muda — continua sem outline obrigatório, mas ganha a opção de solicitar um outline como uma das ações de IA sob demanda já previstas nesse modo.

## Consequências
- UI do Compose ganha uma tela/etapa intermediária de outline antes do draft completo, no modo "Gerar com IA".
- Chamada de outline usa a fila assíncrona já existente (ADR 0028), como todas as chamadas de LLM do sistema.
- Se a Idea (ADR 0049) for a origem do Article, o outline pode usar o `context`/`notes` da Idea como entrada adicional ao prompt.
