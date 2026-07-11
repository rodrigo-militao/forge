# Workflow e Definition of Done

> Regras de processo válidas para todo trabalho a partir de agora — não são específicas de uma feature. Qualquer IA implementadora deve seguir isso independente da tarefa.

## TDD

Teste escrito antes da implementação, para toda mudança nova:
- Backend: teste Go (table-driven) cobrindo o caso de uso/domínio antes do código de produção.
- Frontend: teste Poku para lógica isolada; cenário Playwright antes de fluxo de usuário novo, quando aplicável.

O objetivo declarado é reduzir bugs simples que passam despercebidos em implementação apressada — o teste escrito antes é o que força considerar o caso de borda antes de codar o caminho feliz.

## Definition of Done

Uma tarefa só é considerada `done` quando, nesta ordem:

1. Implementação completa, com testes escritos via TDD (ver acima) passando.
2. Verificação de código morto ou duplicado introduzido pela mudança — removido ou justificado.
3. Suíte de testes completa (não só a da mudança) rodando e passando.
4. Só então: commit.

Nenhum item da lista pode ser pulado para "ganhar tempo" — a lentidão de seguir esses passos é o preço combinado para reduzir o retrabalho de teste manual depois.

## Revisão de arquitetura — fora do fluxo automático por agora

`/improve-codebase-architecture` **não** faz parte da Definition of Done no momento — a skill abre uma sessão de grill que exige bastante intervenção do fundador, o que travaria o fluxo de implementação de outras features enquanto ele não está disponível para acompanhar. A IA implementadora **não deve rodar essa skill por conta própria** em nenhuma tarefa.

O fundador roda `/improve-codebase-architecture` manualmente, direto no terminal, quando tiver atenção disponível para a sessão interativa — periodicamente, não a cada tarefa. Quando isso for reincorporado ao fluxo automático, esta seção será atualizada.

## Git

- Commits locais podem acontecer livremente ao longo do trabalho.
- **Push para `main` exige autorização explícita do fundador a cada vez** — nunca automático, mesmo com todos os itens da Definition of Done cumpridos.

## Testes — cobertura contínua

Melhoria de testes unitários (frontend e backend) é um objetivo contínuo, não uma tarefa pontual: a meta declarada é reduzir a necessidade de teste manual repetido a cada mudança. Qualquer área do código tocada por uma tarefa deve sair com cobertura de teste igual ou melhor do que entrou, não apenas cobrindo a mudança nova isoladamente.
