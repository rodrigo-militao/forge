# ADR 0040: Artigos já usados em edição — ocultos por padrão, toggle revela (refina ADR 0033/0036)

## Status
Aceito

## Contexto
A ADR 0033/0036 já excluía do pool de seleção artigos já usados numa edição anterior, mas não havia forma de o usuário ver esses itens de novo caso quisesse reenviar o mesmo link para outra edição (confirmado como cenário real pelo fundador).

## Decisão
A tela principal do Digest continua ocultando por padrão artigos já usados em alguma edição. Um **toggle explícito** ("mostrar já enviados ao Assemble") revela esses itens de volta na listagem, permitindo selecioná-los novamente para uma nova edição — sem limite de quantas vezes um artigo pode ser reutilizado.

## Consequências
- Query de listagem do Digest ganha um parâmetro (`include_used_in_edition: bool`, default `false`) em vez de excluir incondicionalmente.
- Nenhuma mudança na tela de Library (que já pode listar tudo com seus próprios filtros).
- Nenhum limite de reutilização é imposto — decisão consciente de não adicionar essa restrição.
