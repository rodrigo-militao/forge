# Glossário

**Tenant**
Um usuário/cliente da plataforma. Todo dado relevante (fontes, tópicos, conteúdo gerado, config) é isolado por `user_id`/tenant desde o schema inicial (ver ADR 0002).

**Newsletter Assistant**
Produto de curadoria. Varre a internet por artigos e notícias relevantes ao tema do usuário; o usuário aprova o que entra; o sistema monta a edição semanal. Não gera conteúdo original — cura conteúdo de terceiros.

**Content Editor**
Produto de geração autônoma. A partir de um tópico gerado automaticamente (Topic Generator) ou fornecido pelo usuário, escreve um artigo completo usando o roteamento de 4 vozes.

**Topic Generator**
Componente do Content Editor que decide sobre o que escrever, emitindo `theme_area` (área temática) e `format` (formato do conteúdo), usados para rotear entre as 4 vozes.

**Roteamento de 4 vozes (Voice Routing)**
Sistema determinístico que mapeia `theme_area` + `format` para uma das quatro vozes de escrita: Confessional, Clean Technical, Framework, Essay-manifesto.

**Núcleo compartilhado**
Camada técnica comum aos dois produtos: orquestração de LLM, persistência, modelo de tenant, execução agendada (cron). Ver ADR 0001.

**Draft (rascunho)**
Estado de qualquer conteúdo gerado pela IA antes da aprovação humana. Nenhum produto pula esse estado no MVP (ver ADR 0005).

**Plano ativo**
Flag manual (não automatizada) que indica se um tenant tem acesso liberado à plataforma no MVP. Ver ADR 0008.

**Locale**
Idioma da interface escolhido pelo usuário (`en`, `pt` ou `es`), armazenado por tenant. Não confundir com o idioma do conteúdo gerado pela IA (newsletter/artigo), que é uma decisão de produto separada — ver ADR 0009.

**i18n**
Abreviação padrão de "internationalization". Neste projeto, refere-se exclusivamente à tradução da interface (labels, botões, mensagens), não ao idioma do conteúdo gerado.

**Hexagonal (ports & adapters)**
Estilo de arquitetura do backend: `domain/` e `application/` (regras de negócio, casos de uso) nunca importam `adapters/` (HTTP, Postgres, LLM). O domínio define interfaces (`ports`); a infraestrutura implementa (`adapters`). Ver ADRs de padrões de código do backend.

**Job**
Unidade de trabalho assíncrono registrada na tabela `jobs` do Postgres (ex.: "gerar artigo agora"). Processada pelo worker via `SELECT FOR UPDATE SKIP LOCKED`, sem broker de mensagens externo. Ver ADR 0028.

**Worker**
Container separado da API que roda o scheduler (robfig/cron) e processa a tabela `jobs`. Mesma imagem Docker do backend, comando diferente. Ver ADR 0026.

**MVP (neste projeto)**
Fundador (e depois alguns amigos) conseguem, rodando localmente via Docker: logar, configurar fontes/tópicos, gerar conteúdo em qualquer um dos dois produtos, revisar, aprovar, e exportar manualmente. Sem billing real, sem publicação automática, sem OAuth.
