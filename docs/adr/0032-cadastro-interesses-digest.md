# ADR 0032: Cadastro de interesses — conceito novo, separado de `topics` do Compose

## Status
Aceito

## Contexto
O Digest precisa que o usuário declare interesses (temas/palavras-chave) para focar a busca de artigos/notícias. A tabela `topics` já existe no schema, mas é usada pelo Compose (Topic Generator, para decidir sobre o que escrever). Confirmado com o fundador: são conceitos diferentes — interesse do Digest é "o que buscar/curar"; topic do Compose é "sobre o que escrever".

## Decisão
Nova entidade, ex.: `digest_interests` (`id`, `user_id`, `label`, `created_at`), sem relação direta com `topics`. O pipeline de busca do Digest (ADR 0001, `internal/digest`) passa a filtrar/direcionar a descoberta de fontes usando os interesses cadastrados do tenant.

## Consequências
- Migration nova para `digest_interests`, independente do schema de `topics`.
- Tela de configuração (Settings, ADR 0012) ganha uma seção de gestão de interesses, separada da configuração de tópicos do Compose.
- Futuramente, se fizer sentido unificar os dois conceitos (ex.: um interesse do Digest sugerir automaticamente um topic para o Compose), isso é uma decisão de produto nova — não implícita aqui.
