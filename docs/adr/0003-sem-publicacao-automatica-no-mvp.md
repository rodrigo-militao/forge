# ADR 0003: Sem publicação automática em plataformas externas no MVP

## Status
Aceito

## Contexto
O projeto pessoal do fundador usa a API não-oficial do Substack via cookie de sessão para publicar automaticamente. Isso era um risco consciente e aceito para um projeto de uma pessoa só.

Num SaaS, isso significaria pedir a cada cliente pagante que entregasse o cookie de sessão da própria conta Substack. Isso é inaceitável no momento porque:
- Transfere para a plataforma a custódia de credenciais de sessão de terceiros (risco de segurança).
- A Substack não tem API oficial para isso — o mecanismo é frágil e pode quebrar para todos os tenants de uma vez se a Substack mudar algo.
- Aumenta a superfície de confiança exigida do usuário antes mesmo de ele validar se o produto entrega valor.

## Decisão
No MVP, a plataforma **não publica em nenhuma plataforma externa**. A saída de todo produto (Newsletter Assistant e Content Editor) é um conteúdo revisado e aprovado, pronto para o usuário copiar/exportar e publicar manualmente onde quiser (Substack, blog próprio, LinkedIn, etc.).

Integrações de publicação automática ficam para depois, priorizando plataformas com API explícita e oficial (ex.: WordPress) em vez de mecanismos não-oficiais.

## Consequências
- Remove a maior fonte de risco técnico e de confiança do MVP.
- Simplifica o escopo: não é preciso lidar com autenticação OAuth de terceiros, rate limits de plataformas externas, nem tratamento de falhas de publicação.
- O valor do produto no MVP está 100% em geração/curadoria + revisão, não em distribuição.
