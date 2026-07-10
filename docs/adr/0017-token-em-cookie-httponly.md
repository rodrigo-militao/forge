# ADR 0017: Token de autenticação em cookie httpOnly, não em localStorage

## Status
Aceito

## Contexto
A ADR 0007 já definiu autenticação simples por email/senha no MVP. Falta decidir onde o frontend guarda o token de sessão resultante do login. `localStorage` é acessível via JavaScript no navegador, o que o expõe a roubo de token via XSS (qualquer script malicioso injetado na página consegue ler o token).

## Decisão
O token de sessão é armazenado em **cookie httpOnly** (setado pelo backend na resposta de login), não em `localStorage` nem em variável de estado acessível via JavaScript. O backend Go valida a sessão lendo o cookie a cada request autenticada.

## Consequências
- Elimina a exposição do token a roubo via XSS — mesmo que um script malicioso rode na página, ele não consegue ler um cookie httpOnly.
- Exige que o backend configure CORS e atributos de cookie (`SameSite`, `Secure`) corretamente para funcionar entre o domínio do Cloudflare Pages (frontend) e o domínio da VPS (backend) — isso vira um detalhe técnico do Passo 6 (Autenticação e API HTTP) e do Passo 11 (Deploy), não algo a resolver de improviso depois.
- Logout deve invalidar o cookie no backend, não apenas "esquecer" um valor no frontend.
