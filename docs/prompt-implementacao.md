# Prompt de implementação — Forge

> Cole este prompt como primeira mensagem para a IA implementadora (Claude Code ou equivalente), dentro do repositório já estruturado conforme as instruções de organização abaixo.

---

## PROMPT

Você vai implementar o backend e frontend de um SaaS chamado **Forge**, seguindo um plano de arquitetura já decidido e documentado. Antes de escrever qualquer código, leia nesta ordem:

1. `plan.md` — o plano de implementação completo, passo a passo. Não pule passos: cada um depende do anterior.
2. Todos os arquivos em `docs/adr/` — decisões arquiteturais já tomadas e justificadas. São não-negociáveis: se você identificar um conflito entre uma ADR e uma prática que julgar melhor, **pare e me pergunte antes de decidir sozinho**. Não substitua silenciosamente uma decisão já tomada.
3. `docs/glossario.md` — terminologia do projeto (Digest, Compose, tenant, locale, job, etc.).
4. `docs/design-system.md` — identidade visual, tokens de cor/tipografia e convenção de nomenclatura de módulos visíveis ao usuário, para quando chegarmos no frontend.
5. `legacy/newsletter-cli/` e `legacy/content-editor-cli/` — os dois CLIs existentes em Go que servem de base para o núcleo compartilhado e os dois produtos (Digest e Compose). Estão aqui apenas como referência para o Passo 1 (auditoria) — não são o código final.

### Regras de execução

- **Um passo do `plan.md` por vez.** Ao terminar um passo, pare, resuma o que foi feito e o que ficou pronto (usando o critério de "pronto quando" descrito no próprio passo), e aguarde minha confirmação antes de seguir para o próximo.
- **Código e comentários sempre em inglês**, independentemente de qualquer idioma usado nesta conversa (ADR 0009).
- **Toda decisão técnica já está nas ADRs.** Não introduza bibliotecas, padrões ou serviços que não estejam documentados em `docs/adr/` sem antes perguntar.
- Siga a arquitetura hexagonal descrita no plano: `domain/` e `application/` nunca importam `adapters/`.
- Código deve nascer testável — não trate testes como etapa posterior. Poku para unitário, Playwright para componente/e2e no frontend (ADR 0011); testes Go idiomáticos (table-driven) no backend.
- Comentários no código só quando estritamente necessário para explicar o "porquê", nunca o "o quê" — nomes bons substituem a maioria dos comentários.

### Comece agora pelo Passo 1 do `plan.md`

Audite os dois CLIs em `legacy/`, e produza `docs/auditoria-clis.md` conforme descrito no passo. Não avance para o Passo 2 sem minha confirmação.
