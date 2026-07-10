# ADR 0015: Contrato de API Go ↔ React via OpenAPI gerado a partir do backend

## Status
Aceito

## Contexto
Backend (Go) e frontend (React/TypeScript) são bases de código separadas, implementadas possivelmente por sessões de IA diferentes em momentos diferentes. Sem um contrato explícito, o risco é o backend mudar um campo de resposta e o frontend quebrar silenciosamente, ou a IA implementadora do frontend "inventar" tipos TypeScript a partir de suposições sobre a API.

## Decisão
- O backend Go expõe uma especificação **OpenAPI**, gerada a partir do próprio código (ex.: via `swaggo` ou biblioteca equivalente do ecossistema Go), não escrita manualmente à parte do código — para nunca ficar desatualizada em relação à implementação real.
- O frontend gera seus tipos TypeScript automaticamente a partir dessa especificação (ex.: `openapi-typescript`), em vez de tipos escritos à mão.
- A geração de tipos do frontend deve ser re-executada sempre que a spec do backend mudar — isso vira parte do fluxo de desenvolvimento, não um passo manual esquecível.

## Consequências
- Cria uma dependência explícita: o Passo 6 do plano (Autenticação e API HTTP) deve entregar a spec OpenAPI publicada/acessível antes do Passo 7 (Frontend) gerar os tipos definitivos.
- Elimina uma classe inteira de bugs de integração (campo renomeado, tipo trocado) que só apareceriam em runtime sem essa prática.
- Exige que qualquer endpoint novo no backend já nasça documentado o suficiente para a geração automática funcionar (comentários/annotations conforme a ferramenta escolhida).
