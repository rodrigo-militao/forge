# Glossário do Forge

> Este documento define os principais conceitos de produto, domínio e
> arquitetura do Forge.

------------------------------------------------------------------------

## 1. Visão geral do Forge

O Forge é uma plataforma de apoio à criação de conteúdo escrito.

O usuário utiliza o Forge para:

-   descobrir referências e informações relevantes;
-   gerar ideias e pautas;
-   criar artigos;
-   montar newsletters;
-   revisar e editar conteúdo;
-   acompanhar o estado de produção;
-   publicar manualmente em plataformas externas.

O Forge não publica conteúdo automaticamente. O usuário sempre mantém o
controle sobre o que será utilizado, escrito, alterado e publicado.

------------------------------------------------------------------------

# 2. Conceitos de produto

## 2.1 Article

Um Article é um conteúdo editorial escrito com estrutura de artigo.

Pode ser criado manualmente, iniciado a partir de uma Idea, gerado com
assistência de IA, baseado em referências ou escrito completamente pelo
usuário.

Lifecycle:

    BUILDING
        ↓
    REVIEW
        ↓
    READY
        ↓
    PUBLISHED

Exemplos:

-   artigo técnico;
-   tutorial;
-   ensaio;
-   opinião;
-   análise;
-   post para blog;
-   conteúdo para publicação no LinkedIn.

------------------------------------------------------------------------

## 2.2 Newsletter

Uma Newsletter é uma edição editorial composta por conteúdo selecionado
e organizado para ser publicada como uma publicação periódica.

Pode conter:

-   artigos selecionados;
-   referências;
-   comentários do autor;
-   introdução;
-   conclusões;
-   blocos de texto;
-   links para fontes externas.

Uma Newsletter não é apenas uma lista de links. Ela representa uma
edição editorial que pode ser revisada e organizada pelo usuário antes
da publicação.

------------------------------------------------------------------------

## 2.3 Newsletter Edition

`NewsletterEdition` é o agregado de domínio responsável por representar
uma edição específica de uma Newsletter.

    Newsletter
        ├── Edition #1
        ├── Edition #2
        └── Edition #3

Lifecycle:

    BUILDING
        ↓
    REVIEW
        ↓
    READY
        ↓
    PUBLISHED

Também suporta archive:

    READY ───────────────→ ARCHIVED
       │                        │
       ▼                        │
    PUBLISHED ─────────────→ ARCHIVED
                                │
                                ▼
                             BUILDING

Transições permitidas:

    READY → ARCHIVED
    PUBLISHED → ARCHIVED
    ARCHIVED → BUILDING

------------------------------------------------------------------------

## 2.4 Generated Content

`GeneratedContent` representa conteúdo gerado ou assistido pelo pipeline
de geração do Forge.

É o modelo persistido utilizado principalmente para Articles e conteúdos
gerados pelo sistema.

O fato de um conteúdo ter sido gerado com IA não significa que será
publicado automaticamente. Todo conteúdo gerado deve passar por revisão
humana.

A Sprint 1 adicionou o campo `Type` ao modelo Go (`ContentType` em
inglês), com valor `ContentTypeArticle` ("article", padrão) ou
`ContentTypeNewsletter` ("newsletter"), mapeado para a coluna
`content_type` no banco de dados. O campo permite distinguir se o
conteúdo armazenado é um Article ou uma Newsletter.

------------------------------------------------------------------------

## 2.5 Digest

Digest é o processo de descoberta e curadoria de conteúdo relevante.

O Digest pode:

1.  buscar informações e referências;
2.  identificar conteúdos potencialmente relevantes;
3.  apresentar resultados ao usuário;
4.  permitir a seleção do que será utilizado;
5.  ajudar a formar uma Newsletter.

O Digest não publica automaticamente.

------------------------------------------------------------------------

## 2.6 Compose

Compose é o fluxo de criação de conteúdo a partir de uma intenção
editorial.

O usuário pode:

-   informar um tema;
-   escolher uma Idea;
-   fornecer referências;
-   solicitar sugestões de estrutura;
-   escolher um tom de voz;
-   pedir assistência na escrita.

O resultado pode ser um Article ou outro tipo de conteúdo suportado pelo
produto.

------------------------------------------------------------------------

## 2.7 Idea

Uma Idea representa uma possibilidade futura de conteúdo.

Pode conter:

-   título;
-   descrição;
-   tema;
-   contexto;
-   referências;
-   status;
-   relação com um Article criado posteriormente.

Fluxo típico:

    IDEA
      ↓
    ARTICLE
      ↓
    BUILDING
      ↓
    REVIEW
      ↓
    READY
      ↓
    PUBLISHED

Uma Idea não é necessariamente um Article. Ela representa uma intenção
ou possibilidade de criação.

------------------------------------------------------------------------

# 3. Editorial Lifecycle

## 3.1 Building

`BUILDING` representa conteúdo em construção.

O usuário ainda pode escrever, editar, reorganizar, gerar conteúdo,
adicionar referências, remover conteúdo e pedir assistência à IA.

O conteúdo ainda não está pronto para publicação.

Transição principal:

    BUILDING → REVIEW

Também pode retornar:

    REVIEW → BUILDING
    READY → BUILDING
    PUBLISHED → BUILDING

quando o produto permitir reabertura para edição.

------------------------------------------------------------------------

## 3.2 Review

`REVIEW` representa conteúdo que está sendo revisado.

A revisão pode envolver:

-   o próprio usuário;
-   auxílio da IA;
-   referências;
-   estrutura;
-   tom;
-   qualidade editorial.

`REVIEW` não significa que o conteúdo está pronto para publicação.

Permitidas:

    BUILDING → REVIEW
    REVIEW → BUILDING
    REVIEW → READY

Não permitida:

    REVIEW → PUBLISHED

------------------------------------------------------------------------

## 3.3 Ready

`READY` representa conteúdo que foi revisado e está pronto para
publicação.

Não significa que o Forge publicou o conteúdo.

Significa que:

-   o usuário terminou sua revisão;
-   o conteúdo está em estado publicável;
-   a publicação pode ocorrer.

Transições:

    REVIEW → READY
    READY → BUILDING
    READY → PUBLISHED

------------------------------------------------------------------------

## 3.4 Published

`PUBLISHED` representa conteúdo que foi publicado.

No MVP, a publicação pode ocorrer manualmente fora do Forge.

O Forge não deve assumir que uma integração externa publicou o conteúdo
automaticamente.

Ao passar para `PUBLISHED`, o sistema pode registrar `published_at`.

Esse timestamp representa quando o conteúdo foi marcado como publicado
dentro do Forge, não necessariamente a confirmação de publicação em uma
plataforma externa.

------------------------------------------------------------------------

## 3.5 Archived

`ARCHIVED` representa conteúdo arquivado.

No MVP, é utilizado principalmente para Newsletter Editions.

Conteúdo arquivado:

-   não deve aparecer como conteúdo ativo;
-   não faz parte do fluxo editorial normal;
-   pode ser reaberto quando suportado pelo domínio.

Para Newsletter Editions:

    READY → ARCHIVED
    PUBLISHED → ARCHIVED
    ARCHIVED → BUILDING

------------------------------------------------------------------------

## 3.6 Legacy statuses

### Draft

`DRAFT` é um status legado.

Na migration do Sprint 1:

    DRAFT → BUILDING

`BUILDING` é o status canônico atual.

Código novo não deve criar conteúdo com status `DRAFT`.

------------------------------------------------------------------------

### Discarded

`DISCARDED` é um status legado de `GeneratedContent`.

Conteúdo `DISCARDED`:

-   permanece armazenado;
-   não participa do lifecycle editorial ativo;
-   não pode ser reativado através das transições normais.

------------------------------------------------------------------------

# 4. Content Lifecycle Rules

## 4.1 Article / GeneratedContent

Lifecycle ativo:

    BUILDING
        ↓
    REVIEW
        ↓
    READY
        ↓
    PUBLISHED

Transições permitidas:

    BUILDING → REVIEW
    REVIEW → BUILDING
    REVIEW → READY
    READY → BUILDING
    READY → PUBLISHED
    PUBLISHED → BUILDING

Transições inválidas:

    BUILDING → READY
    BUILDING → PUBLISHED
    REVIEW → PUBLISHED
    READY → REVIEW

------------------------------------------------------------------------

## 4.2 NewsletterEdition

Lifecycle ativo:

    BUILDING
        ↓
    REVIEW
        ↓
    READY
        ↓
    PUBLISHED

Archive:

    READY ──────→ ARCHIVED
    PUBLISHED ──→ ARCHIVED
                     │
                     ▼
                  BUILDING

------------------------------------------------------------------------

# 5. Domain Aggregates

## 5.1 GeneratedContent

`GeneratedContent` é um agregado relacionado ao conteúdo gerado pelo
pipeline do Forge.

É responsável por:

-   armazenar conteúdo gerado;
-   manter seu lifecycle;
-   manter seu `content_type` (article/newsletter);
-   registrar `published_at` na primeira publicação;
-   manter informações de geração;
-   permitir transições editoriais válidas.

Não deve ser usado automaticamente como uma entidade genérica para todos
os tipos futuros de conteúdo.

------------------------------------------------------------------------

## 5.2 NewsletterEdition

`NewsletterEdition` é um agregado separado.

É responsável por:

-   representar uma edição de Newsletter;
-   manter seu próprio lifecycle;
-   organizar conteúdo e artigos associados;
-   suportar archive/unarchive.

`NewsletterEdition` não deve ser fundido automaticamente com
`GeneratedContent`.

Embora ambos representem conteúdo editorial, possuem responsabilidades
diferentes.

------------------------------------------------------------------------

# 6. Relationships

## 6.1 Idea → Article

Uma Idea pode originar um Article.

    Idea
      ↓
    Article

A existência de um Article não necessariamente elimina a Idea original.

------------------------------------------------------------------------

## 6.2 Newsletter → Article

Uma Newsletter pode incluir Articles.

    NewsletterEdition
            │
            ├── Article
            ├── Article
            └── Article

Um Article pode ser associado a uma Newsletter sem deixar de existir
como Article independente.

------------------------------------------------------------------------

# 7. References

References são fontes utilizadas para criar ou fundamentar conteúdo.

Podem incluir:

-   artigos;
-   notícias;
-   posts;
-   páginas web;
-   documentos;
-   outras fontes.

References são diferentes de Sources.

### Sources

`Sources` representam fontes ou configurações utilizadas pelos
mecanismos de busca e descoberta do Forge.

Exemplos:

-   feeds;
-   fontes monitoradas;
-   configurações de busca.

### References

`References` representam itens editoriais concretos utilizados na
criação de conteúdo.

Exemplo:

    Source:
        Hacker News feed

    Reference:
        "Specific article about distributed systems"

A existência de uma Source não significa que cada resultado encontrado
já seja uma Reference persistida.

------------------------------------------------------------------------

# 8. AI Assistance

A IA do Forge é uma ferramenta de assistência.

A IA pode:

-   sugerir ideias;
-   criar estruturas;
-   sugerir títulos;
-   gerar rascunhos;
-   revisar textos;
-   analisar conteúdo;
-   sugerir referências;
-   ajudar a alterar o tom;
-   propor melhorias.

A IA não deve:

-   publicar automaticamente;
-   alterar conteúdo sem uma ação explícita do usuário;
-   avançar o lifecycle sem uma ação explícita;
-   substituir a aprovação do usuário.

Princípio:

    AI assists.
    Human decides.

------------------------------------------------------------------------

# 9. Status Transitions

Toda alteração de status deve passar por validação de domínio.

Fluxo conceitual:

    HTTP Request
         ↓
    Handler
         ↓
    Application Service
         ↓
    Domain Validation
         ↓
    Repository
         ↓
    Database

Exemplo:

    POST /api/content/:id/transition
            ↓
    TransitionStatus
            ↓
    ValidateTransition
            ↓
    Persist

O endpoint legado de alteração direta de status deve delegar para a
mesma lógica de transição.

Não devem existir duas implementações diferentes da regra de lifecycle.

------------------------------------------------------------------------

# 10. Published At

`published_at` registra quando um conteúdo foi marcado como publicado
dentro do Forge.

Ao realizar a primeira transição para:

    PUBLISHED

o sistema deve registrar o timestamp.

O campo não deve ser interpretado automaticamente como confirmação de
publicação em uma plataforma externa.

------------------------------------------------------------------------

# 11. Migration 000021

A migration `000021` introduziu o lifecycle editorial do Sprint 1.

## GeneratedContent

Colunas adicionadas:

    content_type TEXT NOT NULL DEFAULT 'article'
        CHECK (content_type IN ('article', 'newsletter'))
    published_at TIMESTAMPTZ

`content_type` distingue Article de Newsletter no modelo
`GeneratedContent`. `published_at` é preenchido automaticamente na
primeira transição para PUBLISHED.

Status anterior:

    DRAFT
    PUBLISHED
    DISCARDED

Status atual:

    BUILDING
    REVIEW
    READY
    PUBLISHED
    DISCARDED

Dados existentes:

    DRAFT → BUILDING

## NewsletterEdition

Status anterior:

    BUILDING
    READY
    PUBLISHED
    ARCHIVED

Status atual:

    BUILDING
    REVIEW
    READY
    PUBLISHED
    ARCHIVED

Estados legados são preservados quando aplicável.

## Migration Down

A transformação:

    DRAFT → BUILDING

não é semanticamente reversível de forma perfeita.

Após a migration, não é possível distinguir:

    BUILDING criado originalmente como BUILDING

de:

    BUILDING migrado de DRAFT

Portanto, o down migration é uma reversão estrutural e não garante
reconstrução semântica perfeita do estado anterior.

------------------------------------------------------------------------

# 12. Sprint 1 Architectural Principles

## Principle 1 — Lifecycle is domain-owned

O lifecycle pertence ao domínio.

Handlers e repositórios não devem definir suas próprias regras.

## Principle 2 — Articles and Newsletters remain separate aggregates

Articles e Newsletters são conceitos relacionados no produto, mas
possuem responsabilidades diferentes no domínio.

Eles não devem ser fundidos em uma tabela genérica apenas para
compartilhar campos.

## Principle 3 — No automatic publishing

O Forge não publica automaticamente conteúdo sem aprovação explícita do
usuário.

## Principle 4 — Legacy data must remain readable

Migrations devem preservar dados existentes sempre que possível.

Estados legados não devem ser removidos sem uma estratégia explícita de
migração.

## Principle 5 — One source of truth for transitions

Toda mudança de lifecycle deve passar por uma única regra de domínio.

Modelo:

    Application Service
            ↓
    Domain Transition Validation
            ↓
    Repository

------------------------------------------------------------------------

# 13. Current Sprint 1 Scope

A Sprint 1 estabeleceu:

-   lifecycle editorial;
-   estados `BUILDING`, `REVIEW`, `READY` e `PUBLISHED`;
-   suporte a `ARCHIVED` para Newsletter Editions;
-   migração do status legado `DRAFT`;
-   coluna `content_type` (article/newsletter) para GeneratedContent;
-   coluna `published_at` para GeneratedContent;
-   transições válidas e inválidas;
-   proteção de ownership;
-   registro automático de `published_at` na primeira publicação;
-   API de transição;
-   compatibilidade do endpoint legado;
-   testes de domínio;
-   testes de aplicação;
-   testes de handlers.

A Sprint 1 não inclui:

-   Library completa;
-   sistema de References;
-   integrações de publicação;
-   publicação automática;
-   editor completo;
-   chat de IA;
-   workflow colaborativo;
-   múltiplos usuários por workspace;
-   analytics de conteúdo.

Esses temas devem ser tratados em sprints futuras.
