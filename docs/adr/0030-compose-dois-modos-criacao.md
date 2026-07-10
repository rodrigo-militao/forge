# ADR 0030: Compose com dois modos de criação — gerar com IA ou começar em branco

## Status
Aceito

## Contexto
O Compose foi originalmente escopado só como fluxo autônomo (Topic Generator → roteamento de voz → artigo completo). Ao testar o MVP, ficou claro que também é desejável um modo onde o usuário escreve do zero, com ações de IA sob demanda, em vez de sempre receber um artigo completo pronto.

## Decisão
Ao criar um artigo novo no Compose, o usuário escolhe entre dois modos, que convergem para o mesmo tipo de registro (`generated_content`, `product=editor`, `status=draft`):

1. **Gerar com IA** (fluxo original): tema fornecido ou sugerido pelo Topic Generator → roteamento de voz (4 vozes, já existente) → artigo completo gerado → cai como draft para revisão (ADR 0005).
2. **Começar em branco**: editor TipTap vazio, com ações de IA disponíveis sob demanda — não automáticas — como: sugerir tópico, gerar um rascunho a partir de um tema informado, expandir/reescrever um trecho selecionado. Cada ação é um comando explícito do usuário, nunca uma geração automática disparada sem interação.

Ações de IA sob demanda no modo "em branco" reutilizam o mesmo mecanismo de fila assíncrona já definido (ADR 0028: inserir job, `202 Accepted`, polling do resultado) em vez de introduzir um caminho síncrono paralelo — mantém um único padrão de chamada LLM no sistema.

## Consequências
- Ambos os modos produzem o mesmo tipo de rascunho revisável — a UI de revisão/aprovação (ADR 0005) não precisa distinguir a origem do conteúdo.
- Recomenda-se um campo de origem (ex.: `origin`: `ai_generated` / `manual`) em `generated_content` para telemetria/analytics futura — não obrigatório para o fluxo funcionar, mas barato de adicionar agora.
- A IA implementadora deve verificar a estrutura já existente do Compose (já implementado) antes de adicionar o modo "em branco", para reaproveitar o máximo possível da infraestrutura de draft/revisão já construída.
