# Recuperação de senha

Fluxo completo de "esqueci minha senha" sobre o Supabase Auth.

---

## Como funciona

```
/login  →  "Esqueci minha senha"
              ↓
        /forgot-password        usuário informa o e-mail
              ↓                 supabase.auth.resetPasswordForEmail()
        [e-mail com o link]
              ↓
        /auth/callback          valida o token e cria a sessão
              ↓                 emite o cookie httpOnly `l2d-recovery`
        /reset-password         nova senha + confirmação
              ↓                 POST /api/auth/reset-password
        /dashboard              senha trocada, outras sessões encerradas
```

### Os dois formatos de link

O `/auth/callback` aceita as duas formas que o Supabase pode enviar:

| Formato | Parâmetros | Funciona em outro navegador? |
| --- | --- | --- |
| PKCE (padrão) | `?code=` | ❌ só no mesmo navegador que pediu |
| OTP | `?token_hash=&type=` | ✅ sim (pediu no PC, abriu no celular) |

O PKCE guarda um *code verifier* num cookie local; se o e-mail for aberto em
outro aparelho, esse cookie não existe e o link falha. Por isso o callback
suporta os dois — **use o template OTP abaixo** para eliminar esse problema.

---

## Configuração obrigatória no Supabase

### 1. URLs — *Authentication › URL Configuration*

- **Site URL**: `https://seudominio.com` (em dev, `http://localhost:3000`)
- **Redirect URLs** (allowlist), adicione ambas:
  ```
  http://localhost:3000/**
  https://seudominio.com/**
  ```

> Sem a URL na allowlist, o Supabase ignora o `redirectTo` e manda o usuário
> para a Site URL — o link "não faz nada".

### 2. Template de e-mail — *Authentication › Emails › Reset Password*

Troque o corpo por este (é o que habilita o link entre dispositivos):

```html
<h2>Redefinir sua senha</h2>
<p>Recebemos um pedido para redefinir a senha da sua conta no lvl2do.</p>
<p>
  <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&flow=recovery">
    Criar nova senha
  </a>
</p>
<p>O link vale por 1 hora e só pode ser usado uma vez.</p>
<p>Se não foi você que pediu, pode ignorar este e-mail — sua senha continua a mesma.</p>
```

O `flow=recovery` é o que faz o callback tratar a volta como recuperação (o
Supabase não devolve `type` no fluxo PKCE).

### 3. SMTP próprio — *Project Settings › Authentication › SMTP Settings*

**Este é o passo que mais quebra — inclusive em dev.** O servidor de e-mail
embutido do Supabase:

- só entrega para **membros da equipe do projeto**;
- limita a **poucos e-mails por hora**;
- falha de forma opaca quando recusa.

Ou seja: sem SMTP próprio, o usuário final **nunca recebe** o e-mail. Configure
um provedor (Resend, SendGrid, Postmark, Amazon SES…) antes de abrir o cadastro
ao público.

#### Quando o envio falha

`POST /auth/v1/recover` responde `500` com:

```json
{ "code": 500, "error_code": "unexpected_failure", "msg": "Error sending recovery email" }
```

O usuário existe e o token foi gerado — só a **entrega** falhou. A mensagem da
API é sempre essa, genérica; a causa real fica no campo `error` de *Logs › Auth
Logs*:

| `error` no log | Causa | Onde corrigir |
| --- | --- | --- |
| `535 "5.7.8 Authentication failed"` | Usuário/senha SMTP recusados | *SMTP Settings* → Username/Password |
| `550` / `553` / menção a `sender` | Remetente não autorizado | *SMTP Settings* → Sender email (domínio verificado) |
| `dial tcp` / `connection refused` | Host ou porta errados | *SMTP Settings* → Host/Port (use 587) |
| `x509` / `tls` | Handshake TLS | Porta 587 em vez de 465 |
| `template` / `parse` / `executing` | Corpo do template inválido | *Emails › Templates* |

Rate limit é distinto: `429` com `over_email_send_rate_limit`.

> No campo Username, a maioria dos provedores **não** usa o e-mail: Resend exige
> a literal `resend`, SendGrid exige `apikey`, SES exige credenciais SMTP
> próprias (não as chaves `AKIA...` da AWS). É a causa nº 1 de `535`.

Passo a passo de diagnóstico: [passoapassorec.md](passoapassorec.md).

### 4. Validade do link — *Authentication › Providers › Email*

`Email OTP Expiration` controla o prazo do link. O padrão é 3600s (1 hora), que
é o valor citado nas telas.

---

## Decisões de segurança

| Proteção | Onde | Por quê |
| --- | --- | --- |
| Cookie `l2d-recovery` httpOnly | `/auth/callback` → middleware → API | O link de recuperação cria uma sessão real. Sem esse marcador, uma sessão comum (aba esquecida aberta num PC compartilhado) poderia trocar a senha sem saber a atual. |
| Troca de senha no servidor | `POST /api/auth/reset-password` | É o único lugar onde dá para exigir o cookie de verdade — validação no cliente não vale nada. |
| Cookie queimado após o uso | mesma rota | O link não serve para uma segunda troca. |
| `signOut({ scope: "others" })` | mesma rota | Se a conta estava comprometida, o invasor perde o acesso na hora. |
| Resposta genérica ao pedir o link | `/forgot-password` | Não revela se o e-mail existe na base (evita enumeração de contas). |
| API responde 401 JSON | `lib/supabase/middleware.ts` | Antes, um `fetch` sem sessão seguia o redirect para `/login` e recebia 200 — a tela diria "senha alterada" sem ter alterado nada. |
| `next` validado | `/auth/callback` | Bloqueia open redirect via `?next=//site-malicioso.com`. |
| Espera de 60s entre reenvios | `/forgot-password` | Evita bater no limite de e-mails e no rate limit do Supabase. |

---

## Arquivos

| Arquivo | Papel |
| --- | --- |
| `src/app/forgot-password/page.tsx` | Pede o e-mail, reenvio com cooldown |
| `src/app/reset-password/page.tsx` | Nova senha, medidor de força, confirmação |
| `src/app/auth/callback/route.ts` | Valida o link (PKCE **e** OTP), emite o cookie |
| `src/app/api/auth/reset-password/route.ts` | Troca a senha (validação real) |
| `src/lib/auth/password.ts` | Política de senha e medidor de força |
| `src/lib/auth/authErrors.ts` | Erros do Supabase → mensagens em pt-BR |
| `src/lib/auth/recovery.ts` | Nome e opções do cookie de recuperação |
| `src/lib/supabase/middleware.ts` | Rotas públicas + guard do `/reset-password` |
| `src/components/auth/*` | Moldura, campo e medidor compartilhados |

---

## Testes

### Automatizado

```bash
npm run dev                                  # deixe rodando
node scripts/test-password-recovery.mjs      # ou ... http://localhost:3001
```

Cria um usuário descartável, gera um link real pela Admin API (sem enviar
e-mail), percorre o fluxo inteiro, confirma que a senha mudou no banco e apaga o
usuário. Exige `SUPABASE_SERVICE_ROLE_KEY` no `.env.local`.

### Manual

1. `/login` → **Esqueci minha senha** → informe um e-mail cadastrado.
2. Abra o link do e-mail **em outro navegador** (valida o fluxo OTP).
3. Defina a nova senha → deve cair no `/dashboard`.
4. Confirme que a senha antiga não entra mais.
5. Abra o mesmo link de novo → deve dar "link inválido ou expirado".
