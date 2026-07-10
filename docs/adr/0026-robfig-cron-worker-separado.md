# ADR 0026: robfig/cron rodando em container de worker separado da API

## Status
Aceito

## Contexto
O Digest (curadoria diária) e o Compose (geração agendada) precisam de agendamento. Depender do cron do sistema operacional (crontab da VPS chamando o binário) amarraria a lógica de agendamento à configuração daquela VPS específica, contrariando o princípio de portabilidade "tudo dockerizado, troca de cloud sem fricção" (ADR 0006).

## Decisão
**robfig/cron**, biblioteca Go madura de scheduler in-process, rodando como um **container separado** no `docker-compose` — mesma imagem/binário do backend, comando diferente (ex.: `./forge api` vs `./forge worker`).

## Consequências
- Portabilidade total: o worker sobe em qualquer VPS/cloud da mesma forma, como só mais um serviço do `docker-compose`.
- Lógica de agendamento testável em Go normalmente, sem depender de cron do sistema operacional para validar comportamento.
- API e worker já nascem como processos/containers separados desde o MVP — não é uma separação a ser feita depois, é a forma como o sistema roda desde o Passo 9 (Dockerização).
- Isolado atrás de uma interface (`ports.Scheduler`), facilitando troca futura por algo distribuído se um dia for necessário múltiplas instâncias de worker.
