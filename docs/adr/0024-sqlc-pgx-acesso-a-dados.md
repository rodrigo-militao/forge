# ADR 0024: sqlc + pgx para camada de acesso a dados (não GORM)

## Status
Aceito

## Contexto
Precisávamos de uma forma de acessar o Postgres que fosse performática, testável, e sem comportamento implícito escondido — alinhado ao espírito "sem mágica" dos padrões de código do backend (object calisthenics/hexagonal).

## Decisão
**sqlc**, gerando código Go type-safe a partir de SQL escrito à mão, compilando para chamadas `pgx` diretas.

- GORM foi descartado: usa reflection pesada em runtime, tem comportamento implícito (lazy loading, hooks automáticos) e overhead de performance real comparado a acesso direto — o oposto do princípio de "sem mágica" já adotado.
- Com sqlc, o SQL fica explícito e revisável em arquivos `.sql`, e a função Go gerada é tipada — sem reflection, sem ORM escondendo o que roda no banco.

## Consequências
- O adapter de repositório em cada domínio (`adapters/postgres/`) usa as funções geradas pelo sqlc para implementar a interface (`port`) definida no domínio — mantém a regra de dependência do hexagonal.
- Toda query nova precisa ser escrita em SQL explícito antes da geração de código — não há "criar uma entidade e o ORM resolve o resto".
- Facilita revisão (por humano ou IA) porque o SQL real está visível, não abstraído.
