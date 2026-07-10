# ADR 0005: Todo conteúdo gerado passa por revisão humana antes de ser considerado "pronto"

## Status
Aceito

## Contexto
No projeto pessoal (Content Editor), o blog publica sem revisão humana — risco aceito pelo próprio fundador, sobre a própria reputação. Num SaaS, quem está em jogo é a reputação do cliente pagante, não do fundador. Além disso, a ADR 0003 já elimina a publicação automática no MVP, o que torna a revisão humana o próximo elo natural do fluxo.

## Decisão
Independente do produto (Newsletter Assistant ou Content Editor), todo conteúdo gerado pela IA entra no sistema com status `draft` e só é considerado finalizado após aprovação explícita do usuário. Não existe caminho de auto-publicação ou auto-aprovação no MVP.

- **Newsletter Assistant**: cada artigo/notícia encontrado entra como sugestão pendente; o usuário aprova/rejeita item a item antes da montagem da edição semanal.
- **Content Editor**: cada artigo gerado entra como rascunho completo; o usuário revisa e aprova (ou pede regeneração) antes de exportar.

## Consequências
- Estado `draft → aprovado` é um conceito do núcleo compartilhado (ADR 0001), não duplicado por produto.
- Autonomia total (auto-publicação sem revisão) fica marcada como possível funcionalidade futura, mas não faz parte do MVP nem está no roadmap imediato pós-MVP.
