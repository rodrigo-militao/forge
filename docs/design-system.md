# Design System — Forge

> Referência de identidade visual para implementação. Nome definido: **Forge**. Paleta e sistema tipográfico: herdados da exploração "Draftlane" (mockup de referência). Este documento é a fonte da verdade para qualquer IA ou pessoa implementando UI — não redecidir cor/tipografia a cada tela nova, consultar aqui.

Se o nome mudar no futuro, **apenas este cabeçalho e o logo mudam** — os tokens abaixo permanecem.

---

## 1. Identidade

**Nome**: Forge
**Personalidade**: ferramenta séria de trabalho, não brinquedo de IA. Dark-mode-first, editorial, com uma pitada de "instrumento técnico" (referências a pipeline, terminal, versionamento) sem virar dev-tool hostil para não-devs.
**O que evitar**: gradiente roxo/azul genérico de SaaS, ilustração de robô fofo, tom "IA mágica", excesso de emoji/animação.

---

## 2. Cor

### Paleta base (4 cores nomeadas)

| Token | Nome | Hex | Papel |
|---|---|---|---|
| `color-bg-base` | Carvão | `#1D1F24` | Fundo principal (app é dark-mode-first) |
| `color-surface` | Branco quente | `#F7F6F3` | Texto principal sobre fundo escuro; fundo de superfícies claras quando necessário (ex.: cards em contexto light) |
| `color-accent-success` | Verde musgo | `#567A61` | Estados de sucesso/aprovação — nunca usado para ação primária |
| `color-accent-primary` | Laranja queimado | `#C96B2C` | Ação primária (CTAs, botão principal, item ativo/selecionado) |

### Cores derivadas (necessárias, não estavam no mockup — inferidas para uso prático)

| Token | Hex sugerido | Papel |
|---|---|---|
| `color-surface-elevated` | `#262931` | Cards, painéis, sidebar — um tom acima do fundo base |
| `color-border` | `#33363E` | Bordas sutis entre elementos, divisores |
| `color-text-secondary` | `#A6A9B0` | Texto de apoio, metadados, timestamps |
| `color-text-muted` | `#6E7178` | Texto desabilitado, placeholders |
| `color-accent-danger` | `#B84A3E` | Erros, ações destrutivas (rejeitar, excluir) — vermelho terroso, não vermelho puro, pra manter a paleta coesa |

### Regras de uso semântico

- **Laranja queimado = a única cor de ação primária.** Um botão principal por tela. Não usar laranja para decoração.
- **Verde musgo = só para confirmar que algo foi aprovado/concluído.** Nunca usar como cor de botão de ação (isso é papel do laranja).
- Estados neutros (rascunho, pendente) usam tons de cinza (`color-text-secondary`/`color-border`), nunca cor de destaque.
- Fundo é sempre `color-bg-base` — não introduzir modo claro no MVP (simplifica o design system; se precisar de light mode depois, é extensão, não redesenho).

---

## 3. Tipografia

Três papéis, como no mockup de referência:

| Papel | Token | Uso | Sugestão de fonte (Google Fonts, gratuita) |
|---|---|---|---|
| Display/títulos | `font-display` | Serifada — autoridade e clareza. Títulos de página, nome do produto, headings principais | **Fraunces** (variável, tem peso pra ficar editorial sem parecer clássica demais) ou **Source Serif 4** |
| Corpo | `font-body` | Sans — leitura limpa. Texto corrido, labels, botões, navegação | **Inter** ou **IBM Plex Sans** |
| Técnico/detalhes | `font-mono` | Monoespaçada — técnico e direto. Timestamps, versões (`v1.2.3`), tags de categoria, trechos de código/URL | **IBM Plex Mono** ou **JetBrains Mono** |

### Escala tipográfica sugerida

```
--text-display:  2.25rem / peso 600 / font-display   (título de página)
--text-h2:       1.5rem  / peso 600 / font-display    (título de seção)
--text-body:     0.9375rem / peso 400 / font-body     (texto padrão)
--text-small:    0.8125rem / peso 400 / font-body     (metadados, labels)
--text-mono:     0.8125rem / peso 500 / font-mono     (tags, versões, timestamps)
```

---

## 4. Motion (transições e loading)

Tokens de movimento, para consistência nas animações de loading e transição:

```
--duration-fast:   120ms   (hover, toggle, micro-interação)
--duration-base:   200ms   (abrir/fechar painel, troca de tab)
--duration-slow:   320ms   (transição de tela inteira, modal)
--easing-standard: cubic-bezier(0.4, 0, 0.2, 1)   (padrão pra maioria das transições)
--easing-enter:    cubic-bezier(0, 0, 0.2, 1)      (elementos entrando)
--easing-exit:     cubic-bezier(0.4, 0, 1, 1)       (elementos saindo)
```

Loading states: preferir **skeleton screens** (formato do conteúdo final em tom `color-border` pulsante) a spinners genéricos, especialmente em listas (fila de aprovação, Library) — reduz a sensação de espera em conteúdo textual, que é o núcleo do produto. Spinner simples aceitável só em ações pontuais de botão (ex.: "Gerando..." dentro do próprio botão).

---

## 5. Componentes-chave (padrões observados no mockup de referência)

Estes são os componentes que já apareceram nas explorações e devem seguir convenção fixa:

- **Sidebar de navegação**: fundo `color-surface-elevated`, item ativo com fundo levemente destacado + texto em `color-surface` (branco quente), ícone + label, sem cor de destaque no ícone (neutro até estar ativo).
- **Badges/pills de status**: totalmente arredondados (`border-radius: 999px`), padding curto. Cores: `Aprovado` → verde musgo; `Revisar`/ação pendente → laranja queimado; `Rascunho` → cinza neutro (`color-border` como fundo, `color-text-secondary` como texto).
- **Cards** (ex.: artigo encontrado, item de biblioteca): fundo `color-surface-elevated`, borda sutil `color-border`, `border-radius: 12px`, sem sombra pesada (dark mode não precisa de shadow forte — usar diferença de tom em vez de sombra).
- **Tabs de fluxo em etapas** (ex.: "1. Descobrir → 2. Selecionar → 3. Montar → 4. Revisar"): usar apenas quando a sequência representa um processo real (isso já é o caso no fluxo de aprovação de conteúdo — ver ADR 0005). Etapa ativa em laranja queimado, etapas futuras em cinza neutro, etapas concluídas com ícone de check em verde musgo.
- **Botão primário**: fundo laranja queimado, texto branco quente, `border-radius: 8px`, sem gradiente.
- **Botão secundário/rascunho**: transparente ou `color-surface-elevated`, borda `color-border`, texto `color-text-secondary`.

---

## 6. Tom de voz na interface (herda das ADRs do produto)

Reforçando o que já está definido no plano (ADR 0005 — revisão humana obrigatória): a interface nunca deve sugerir que algo foi publicado ou decidido sozinho pela IA. Vocabulário:

- **Certo**: "Rascunho pronto para revisão", "Aprovar", "Aguardando sua revisão"
- **Evitar**: "Publicado automaticamente", "A IA decidiu...", qualquer linguagem que implique autonomia sem o usuário no controle

Mensagens de erro são diretas e não se desculpam ("Não foi possível gerar o conteúdo. Tente novamente." em vez de "Ops! Algo deu errado 😅").

---

## 7. Nomenclatura de módulos (do mockup)

O mockup já validou uma convenção que funciona e deve ser mantida:

- **Digest** → módulo de Newsletter Assistant (curadoria semanal)
- **Compose** → módulo de Content Editor (geração de artigo)
- **Library** → histórico de conteúdo gerado/aprovado (ambos os módulos)
- **Settings** → configuração de fontes, tópicos, vozes

Isso substitui os nomes de trabalho "Newsletter Assistant" e "Content Editor" usados no `plan.md` e nas ADRs — a partir de agora, ao implementar UI, usar **Digest** e **Compose** como nome de produto visível ao usuário. Os nomes técnicos internos (`internal/newsletter`, `internal/editor` no código-fonte) podem continuar como estão — é só a camada visível ao usuário que muda.

---

## 7.1 Internacionalização (ADR 0009)

Toda string de UI é uma chave de tradução, nunca texto literal no componente — inglês é o idioma default, com português e espanhol como as outras duas opções. O seletor de idioma vive nas `Settings` (ver seção 6) e persiste no campo `locale` do usuário. Isso não é opcional nem um passo "para depois": todo componente novo já nasce com a string externalizada, mesmo que só a tradução em inglês esteja completa no início.

---

## 8. O que este documento não decide (fora de escopo aqui)

- Fonte exata de logo/wordmark (o mockup usa um texto estilizado "Forge" com um elemento gráfico — refinar quando for desenhar o logo real)
- Light mode (não existe no MVP, ver seção 2)
- Iconografia (qual biblioteca de ícones usar — sugestão prática: Lucide, que já está disponível no ecossistema React usado no projeto)
