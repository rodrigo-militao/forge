# ADR 0047: Renomear Digest para "Discover" (cosmético — nomes internos não mudam)

## Status
Aceito

## Contexto
A visão de produto revisada trata "Discover" como o radar de monitoramento de fontes/temas, alimentando o fluxo `Discover → Inbox → Content`. O nome "Digest" (implicava só "resumo semanal") não comunica mais isso.

## Decisão
- Label visível ao usuário muda de **Digest** para **Discover** em toda a UI (nav, títulos de tela, textos).
- **Nomes internos permanecem inalterados**: tabelas (`digest_articles` etc.), rotas de API, pastas de código (`internal/digest`) — renomear isso é risco de migration sem ganho funcional. Só a camada visível ao usuário muda.
- A IA implementadora deve tratar isso como find-and-replace de texto de UI (i18n strings, ADR 0009), não como refatoração de schema/código.

## Consequências
- Arquivos de tradução (`en.json`, `pt.json`, `es.json`) precisam da string "Discover" no lugar de "Digest" nos textos visíveis.
- Nenhuma migration necessária.
- Documentação (ADRs, design system) deste ponto em diante usa "Discover" ao se referir à tela; ADRs antigas continuam mencionando "Digest" como estavam escritas — não retroagir a nomenclatura em documentos históricos.
