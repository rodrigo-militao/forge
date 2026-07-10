# ADR 0009: Internacionalização da interface desde o início; código sempre em inglês

## Status
Aceito

## Contexto
O produto pode atrair usuários fora do público brasileiro inicial (a expansão natural já prevista inclui qualquer criador de conteúdo, não só devs BR). Retrofitar i18n depois de strings hardcoded espalhadas pelo frontend é um trabalho caro e propenso a esquecer textos. Ao mesmo tempo, o time de desenvolvimento (fundador + futuras IAs implementadoras) se beneficia de código-fonte em um único idioma, independente de quantos idiomas a interface suporte.

Importante separar dois problemas diferentes, que não devem ser confundidos:
1. **Idioma da interface** (labels, botões, mensagens do produto) — isso é o escopo desta ADR.
2. **Idioma do conteúdo gerado** (a newsletter ou artigo que a IA escreve para o usuário) — isso é uma decisão de produto separada, não coberta aqui. Hoje o Content Editor gera em português (público BR). Se/quando o produto atender usuários que querem gerar conteúdo em inglês ou espanhol, essa é uma configuração por tenant a ser desenhada depois, não implícita nesta ADR.

## Decisão
**Interface (i18n):**
- Idiomas suportados desde o MVP: **inglês (default), português, espanhol**.
- Toda string visível ao usuário na UI é externalizada em arquivo de tradução desde a primeira tela implementada — nunca hardcoded no componente, nem "para adicionar i18n depois".
- Biblioteca de i18n padrão de mercado para o stack escolhido (frontend React/SPA): `react-i18next` ou `next-intl`/`i18next` conforme o framework final do frontend definido no Passo 7.
- Idioma detectado por padrão do navegador na primeira visita, com opção de troca manual persistida por usuário (campo `locale` no registro do tenant).

**Código-fonte:**
- Código, comentários, nomes de variáveis, funções, tabelas e mensagens de commit: **sempre em inglês**, independentemente de quantos idiomas a interface suporta. Isso vale tanto para o backend Go quanto para o frontend.

## Consequências
- Todo componente de UI criado a partir de agora precisa nascer com chave de tradução (`t('digest.approve_button')`, por exemplo) em vez de texto literal — isso é regra de arquitetura desde o primeiro componente, não um passo de "internacionalizar" no fim.
- O schema do banco ganha um campo `locale` na tabela `users` desde o Passo 3.
- Aumenta ligeiramente o esforço de cada tela nova (escrever a chave + entrada nos 3 arquivos de tradução), mas evita a migração cara de retrofit.
- Não decide o idioma do conteúdo gerado pela IA — isso fica em aberto como decisão de produto futura (ver seção de contexto acima).
