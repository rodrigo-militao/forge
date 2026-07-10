# ADR 0007: Autenticação usuário/senha no MVP; OAuth fica para a fase 2

## Status
Aceito

## Contexto
OAuth é preferível a longo prazo (evita guardar senha na própria base). Mas o MVP é destinado apenas ao fundador e alguns amigos — implementar OAuth agora (registro de app em provedores, telas de consentimento, callback handling) é esforço desproporcional ao valor no estágio atual.

## Decisão
MVP usa autenticação simples por email/senha (hash com bcrypt ou argon2, sem 2FA, sem magic link). Sessão via JWT ou cookie de sessão simples no backend Go.

Login social (Google/GitHub OAuth) é adiado explicitamente para a fase 2, quando houver usuários externos reais além do círculo próximo.

## Consequências
- Implementação rápida, sem dependência de provedores externos de identidade.
- Fundador assume responsabilidade de guardar hash de senha com segurança adequada desde o MVP (não é "opcional fazer direito" mesmo sendo MVP).
- Migração para OAuth na fase 2 deve ser aditiva (permitir login social sem obrigar reset de contas existentes), não uma reescrita do sistema de auth.
