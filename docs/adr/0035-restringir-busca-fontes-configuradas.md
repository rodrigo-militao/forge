# ADR 0035: Toggle para restringir a busca do Digest apenas às fontes configuradas

## Status
Aceito

## Contexto
O Digest hoje busca conteúdo na internet de forma mais aberta. O fundador quer a opção de restringir a busca somente às sources cadastradas pelo tenant (ADR 0032 trata do cadastro; esta ADR trata do comportamento de busca).

## Decisão
Campo booleano por tenant, ex.: `restrict_search_to_sources` (default `false` no MVP, para não quebrar o comportamento atual sem o usuário optar). Quando `true`, o pipeline de descoberta do Digest (`internal/digest`) consulta exclusivamente as sources cadastradas e ativas do tenant — nenhuma busca aberta na web além delas. Quando `false`, comportamento atual é mantido (busca mais ampla, sources cadastradas como direcionamento, não limite rígido).

## Consequências
- Toggle exposto em Settings, junto da gestão de sources (ADR 0032).
- Sem isso, o produto continua funcionando exatamente como antes — é uma opção adicional, não uma mudança de comportamento padrão.
- Combinado com o limite de sources ativas (ADR 0034), um tenant no modo restrito fica organicamente limitado ao número de sources permitido pelo plano.
