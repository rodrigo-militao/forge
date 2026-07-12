# ADR 0037: Categoria (sugerida por IA) + tags (criadas pelo usuário) em artigos do Digest

## Status
Aceito

## Contexto
O fundador quer conseguir organizar/achar artigos descobertos mais facilmente. Dois mecanismos foram pedidos: uma categorização automática feita pela IA, e tags livres criadas pelo próprio usuário.

## Decisão
Dois conceitos separados, ambos aplicados a artigos do Digest:
- **`category`**: campo único por artigo, sugerido automaticamente pela IA no momento da descoberta (ex.: "Banco de dados", "DevOps", "IA"). Editável pelo usuário se a sugestão não fizer sentido, mas continua sendo um único valor por artigo, não uma lista.
- **`tags`**: relação muitos-para-muitos, criadas livremente pelo usuário (`article_tags` + `tags`, ou array/JSONB simples se o volume não justificar tabela própria — a IA implementadora decide o formato mais simples adequado ao volume esperado). Sem sugestão automática de IA — são inteiramente definidas pelo usuário.
- Ambos entram como filtro na tela do Digest e na Library.

## Consequências
- Este modelo é deliberadamente simples e não tenta resolver a visão maior de "diretórios de estudo" mencionada pelo fundador — essa é uma decisão de posicionamento de produto adiada (mesmo raciocínio da ADR 0008: decidir com dado real de uso, não antecipar). `category` e `tags`, do jeito que estão desenhados aqui, são compatíveis com uma extensão futura para diretórios — não é retrabalho, é extensão.
- A IA implementadora deve verificar se já existe algo parecido com "category" no schema atual (dado que Digest já roda em produção) antes de criar campo novo duplicado.
