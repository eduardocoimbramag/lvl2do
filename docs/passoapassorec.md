# Passo a passo — colocar a recuperação de senha para funcionar

Este guia é para você seguir do começo ao fim, na ordem. Cada passo tem o que
fazer, onde clicar e como saber se deu certo.

> **Atualizado em 17/08/2026**, depois de reproduzir o erro e ler o log do
> Supabase. **A causa está identificada.** Não é palpite e não tem mais "pode
> ser isso ou aquilo": o log diz exatamente o que está errado.

---

## Estado atual — a causa exata

O log do Supabase (`Logs › Auth Logs`) trouxe a linha que faltava:

```
"path":       "/recover"
"status":     500
"error":      535 "5.7.8 Authentication failed"
"auth_event": { "action": "user_recovery_requested",
                "actor_username": "eduardocoimbramag@gmail.com" }
```

### Traduzindo

O número **535** é um código do protocolo de e-mail. Ele significa uma coisa só:

> **"O servidor de e-mail recusou o seu usuário e senha."**

Ou seja: o Supabase montou o e-mail direitinho, foi entregar ao serviço de
envio, tentou se identificar — e **o serviço de e-mail disse "essas credenciais
não valem".** Com isso o e-mail não sai, e o Supabase devolve o `500` que você
viu no navegador.

### O que o log prova (e o que você pode parar de investigar)

| Constatação | Como o log prova |
|---|---|
| ✅ Seu código está certo | O pedido chegou ao Supabase e virou um `user_recovery_requested` válido |
| ✅ Sua conta existe e foi encontrada | O log traz o seu `actor_id` e o seu e-mail |
| ✅ **O template do e-mail NÃO é o problema** | Erro de template dá mensagem sobre `template`/`parse`. O seu é `535`, um erro de **login no servidor de e-mail** |
| ✅ Você **já ativou** o Custom SMTP | Sem SMTP próprio não existe login para falhar. Esse erro só acontece com SMTP configurado |
| ✅ O **endereço e a porta** do servidor estão certos | Ele **conectou** (levou 462 ms e chegou até a etapa de login). Host errado daria "connection refused"/timeout, não 535 |
| ✅ Não é limite de envio | Limite retorna `429`, não `500` |

**Sobrou uma única coisa errada: o usuário e/ou a senha do SMTP.**

> Uma observação: o `request_id` do log que você mandou
> (`01a010e3-6ae6-7e3f-904d-134d6bc8ca65`) é de um dos testes que **eu** fiz
> para diagnosticar. Não se assuste — é o mesmo erro que o seu.

### O conserto

É o **passo 1**, e é a única coisa que te separa de funcionar. Provavelmente
leva 5 minutos, porque o motivo mais comum de `535` não é a senha errada — é o
**campo de usuário preenchido com o valor errado.** Explico no passo.

---

## Continua valendo: não tem banco de dados nisso

A recuperação de senha não guarda nada nas suas tabelas. Ela acontece inteira
dentro do Supabase Auth, que é um sistema separado, com tabelas próprias que o
Supabase administra sozinho (elas ficam num lugar chamado `auth`, e você nem tem
acesso direto a ele).

Quando o usuário troca a senha, quem grava a nova senha é o Supabase. Sua tabela
`profiles` não muda, não tem coluna nova, não tem SQL para rodar. **Nada de
`.sql` novo. E nada de programação — o código está pronto.**

---

## O que falta (a lista completa)

| # | O que falta | Onde | Leva | Obrigatório? |
|---|---|---|---|---|
| 1 | **Corrigir o usuário/senha do SMTP** | Painel do Supabase | 5 min | 🔴 **É o que está te travando** |
| 2 | Confirmar que o envio voltou | Terminal ou navegador | 2 min | ✅ Sim |
| 3 | Conferir o template do e-mail | Painel do Supabase | 3 min | ✅ Sim (não é o culpado, mas é necessário) |
| 4 | Confirmar os endereços de retorno | Painel do Supabase | 2 min | ✅ Sim |
| 5 | Testar o fluxo inteiro | Navegador | 5 min | ✅ Sim |
| 6 | Preencher a chave que falta no `.env.local` | Seu computador | 3 min | ⚠️ Só para o teste automático |
| 7 | Rodar o teste automático | Terminal | 2 min | ⚠️ Recomendado |
| 8 | Salvar o código no Git | Terminal | 2 min | ✅ Sim |

---

## Passo 1 — Corrigir o usuário e a senha do SMTP

### Onde mexer

Abra: https://supabase.com/dashboard/project/mtolqhwvpizmaozfaxrn/settings/auth

Role até **SMTP Settings** (ou: ⚙️ **Project Settings** → **Authentication** →
**SMTP Settings**).

Você vai ver os campos já preenchidos — foi você quem preencheu. **Não mexa no
Host nem na Port**: o log provou que eles estão certos, porque a conexão chegou
a acontecer. Mexa só em **Username** e **Password**.

### A armadilha nº 1 (é quase sempre essa)

Quase todo serviço de e-mail **não usa o seu e-mail como usuário do SMTP.** Eles
usam uma palavra fixa, sempre a mesma, e a "senha" é a chave de API.

Praticamente todo mundo erra colocando o próprio e-mail no campo Username. O
resultado é exatamente `535 Authentication failed`.

Ache o seu serviço nesta tabela e preencha **exatamente** assim:

| Serviço | Username (usuário) | Password (senha) |
|---|---|---|
| **Resend** | a palavra `resend` | a API key, começa com `re_` |
| **SendGrid** | a palavra `apikey` | a API key, começa com `SG.` |
| **Postmark** | o *Server API Token* | **o mesmo** Server API Token |
| **Brevo (Sendinblue)** | o e-mail de login da conta | a **chave SMTP** (não a senha da conta) |
| **Mailgun** | `postmaster@mg.seudominio.com` | a senha SMTP do domínio |
| **Amazon SES** | credencial **SMTP** gerada no SES | credencial **SMTP** gerada no SES |
| **Gmail** | seu e-mail completo | uma **Senha de app** de 16 letras |

⚠️ Repare: em **Resend** e **SendGrid** o usuário é uma palavra literal —
`resend` e `apikey`, escritas assim mesmo, iguais para todo mundo. Não é
apelido, não é o seu e-mail.

### As armadilhas nº 2 a nº 5

Se o usuário já estava certo, é uma destas:

1. **Senha colada com espaço ou quebra de linha.** Ao copiar a chave, é fácil
   pegar um espaço no fim. Apague o campo inteiro, cole de novo e confira que
   não sobrou espaço antes nem depois.
2. **Chave incompleta.** As chaves são longas e às vezes o copiar corta. Gere uma
   **chave nova** no serviço e cole essa — é mais rápido que conferir a antiga.
3. **Chave revogada ou de outro projeto.** Se você criou e apagou chaves
   testando, a que está lá pode não valer mais. Gere uma nova.
4. **Amazon SES:** as credenciais SMTP **não são** suas chaves da AWS
   (`AKIA...`). São credenciais separadas, geradas no console do SES em *SMTP
   Settings › Create SMTP credentials*. Usar a chave da AWS dá 535 sempre.
5. **Gmail:** a senha da sua conta **nunca** funciona. Precisa ter verificação em
   duas etapas ligada e gerar uma "Senha de app". E o Gmail não é boa ideia para
   um site de verdade — tem limite baixo e cai em spam.

### Ainda no mesmo formulário

Confira também, logo acima:

- **Sender email** — precisa ser de um domínio que você **verificou** no
  serviço. Um `@gmail.com` ali é recusado pela maioria dos provedores.
- **Sender name** — pode ser `lvl2do`.

### Depois

Clique em **Save**. Vá para o passo 2 na hora.

### E se eu não lembro qual serviço eu configurei?

Olhe o campo **Host** no formulário — ele te diz:

| Host | Serviço |
|---|---|
| `smtp.resend.com` | Resend |
| `smtp.sendgrid.net` | SendGrid |
| `smtp.postmarkapp.com` | Postmark |
| `smtp-relay.brevo.com` | Brevo |
| `smtp.mailgun.org` | Mailgun |
| `email-smtp.*.amazonaws.com` | Amazon SES |
| `smtp.gmail.com` | Gmail |

### E se eu não tiver domínio próprio ainda?

O **Resend** te dá o remetente de teste `onboarding@resend.dev`, que funciona
**sem domínio verificado** — mas só entrega para o e-mail da sua própria conta
Resend. Para destravar o teste no localhost, resolve. Para publicar, não: aí o
domínio verificado é obrigatório.

---

## Passo 2 — Confirmar que o envio voltou

Não abra o site ainda. Este teste é mais rápido e a resposta é mais clara.

### O teste de 10 segundos

Cole no terminal, dentro da pasta do projeto:

```bash
cd ~/Desktop/Code/lvl2do
URL=$(grep '^NEXT_PUBLIC_SUPABASE_URL=' .env.local | cut -d= -f2-)
KEY=$(grep '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' .env.local | cut -d= -f2-)
curl -s -w "\nHTTP %{http_code}\n" -X POST "$URL/auth/v1/recover" \
  -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d '{"email":"eduardocoimbramag@gmail.com"}'
```

É exatamente o comando que usei para diagnosticar o seu caso.

### Lendo o resultado

| Resposta | Significa |
|---|---|
| `{}` + `HTTP 200` | 🎉 **Funcionou.** O e-mail saiu. Vá olhar sua caixa de entrada (e o spam) |
| `Error sending recovery email` + `HTTP 500` | Ainda errado. Volte ao passo 1 e **releia o log** — veja abaixo |
| `HTTP 429` | Você bateu no limite de tentativas por hora. Espere e teste depois |

### Se ainda der 500, volte ao log

Abra https://supabase.com/dashboard/project/mtolqhwvpizmaozfaxrn/logs/auth-logs
e olhe o campo `error` da linha mais recente. **Ele muda conforme o problema** —
é assim que você sabe se avançou:

| `error` no log | O que fazer |
|---|---|
| `535 "5.7.8 Authentication failed"` | Usuário/senha ainda errados. Releia a tabela do passo 1 — confira o **Username** primeiro |
| `550`, `553`, ou algo com `sender`/`from` | Credenciais OK! Agora é o **Sender email**: use um endereço de domínio verificado |
| `dial tcp`, `connection refused`, `timeout` | Host ou porta errados. Tente a porta `587` |
| `x509`, `certificate`, `tls` | Problema de segurança da conexão. Tente a porta `587` em vez de `465` |
| algo com `template`, `parse`, `executing` | Aí sim é o template — vá para o **passo 3** |

> Cada mensagem diferente é progresso: quer dizer que você passou da etapa
> anterior.

---

## Passo 3 — Conferir o template do e-mail

**Este não é o culpado do erro atual** — o log deixou claro. Mas ele ainda é
necessário, por um motivo diferente: sem ele, o link do e-mail **só funciona no
mesmo navegador** onde a pessoa pediu a recuperação.

Pense no caso normal: a pessoa pede no computador e abre o e-mail no celular.
Com o link padrão do Supabase, não funciona. O usuário acha que seu site está
quebrado.

### O que fazer

1. Abra: https://supabase.com/dashboard/project/mtolqhwvpizmaozfaxrn/auth/templates

   (Ou: **Authentication** → **Emails** → aba **Templates**.)

2. Na lista de templates, clique em **Reset Password**.

3. No campo **Subject heading** (o assunto do e-mail):

   ```
   Redefinir sua senha — lvl2do
   ```

4. No campo grande de baixo (**Message body**), **apague tudo** e cole isto —
   não redigite, **copie e cole**:

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

5. Clique em **Save**, recarregue a página e confira que o texto continuou lá.

### O que significam aquelas chaves duplas

Não são erro de digitação. São "espaços em branco" que o Supabase preenche na
hora de enviar:

- `{{ .SiteURL }}` → vira o endereço configurado em **Site URL** (passo 4).
- `{{ .TokenHash }}` → vira o código secreto e único daquele pedido.

Copie exatamente. Estes erros de digitação quebram o envio (e aí sim o log
falaria em `template`):

| Errado | Certo |
|---|---|
| `{{.TokenHash}}` | `{{ .TokenHash }}` — precisa dos espaços |
| `{{ .Tokenhash }}` | `{{ .TokenHash }}` — `H` maiúsculo |
| `{{ TokenHash }}` | `{{ .TokenHash }}` — precisa do ponto |
| `{{ .SiteUrl }}` | `{{ .SiteURL }}` — `URL` tudo maiúsculo |

⚠️ O pedaço `&flow=recovery` no final também é obrigatório. É ele que avisa ao
seu código "este usuário está trocando a senha, mande ele para a tela certa".
Ele não causa erro de envio — o problema só apareceria ao clicar no link.

---

## Passo 4 — Confirmar os endereços de retorno

Talvez você já tenha feito. Confirme mesmo assim: não causa o erro atual, mas
causa o **próximo** se estiver faltando.

### Por que isso existe

Quando o usuário clica no link do e-mail, ele volta para o seu site. O Supabase
só devolve o usuário para endereços que **você autorizou antes** — isso impede
que alguém use o seu projeto para mandar gente para um site falso.

Se faltar, o link do e-mail parece "não fazer nada": o usuário clica e cai na
página inicial, sem tela de nova senha.

### O que fazer

1. Abra: https://supabase.com/dashboard/project/mtolqhwvpizmaozfaxrn/auth/url-configuration

2. Em **Site URL**, confirme:

   ```
   http://localhost:3000
   ```

   > Quando publicar o site de verdade, volte aqui e troque pelo endereço real.

3. Em **Redirect URLs**, confirme que existem **as duas** linhas (se faltar,
   **Add URL**, uma de cada vez):

   ```
   http://localhost:3000/**
   ```
   ```
   https://seudominio.com/**
   ```

   > Os dois asteriscos `**` significam "e qualquer página dentro desse
   > endereço". É o que libera o `/auth/callback`, para onde o link aponta.

4. **Save**.

---

## Passo 5 — Testar o fluxo inteiro

Agora sim, no navegador.

1. No terminal:

   ```bash
   cd ~/Desktop/Code/lvl2do
   npm run dev
   ```

   Deixe rodando.

2. Abra `http://localhost:3000/login` → **Esqueci minha senha**.

3. Digite `eduardocoimbramag@gmail.com` e envie.

4. A tela deve mostrar "Verifique seu e-mail" **sem** faixa vermelha de erro.

5. Vá no Gmail. Deve chegar em menos de um minuto (**cheque o spam** — é comum
   na primeira vez).

6. **Abra o link em outro navegador.** Sério, faça isso: se você usa Chrome, abra
   no Safari. Ou mande o link para o celular. É esse cenário que o template do
   passo 3 conserta, e é o único jeito de confirmar que funcionou.

7. Você deve cair na tela de nova senha. Digite uma senha nova (mínimo 6
   caracteres) duas vezes e confirme.

8. Você deve ir parar no `/dashboard`, já logado.

### Depois, confirme estas três coisas

- [ ] Faça logout e tente entrar com a **senha antiga** → deve dar erro.
- [ ] Entre com a **senha nova** → deve funcionar.
- [ ] Volte no e-mail e clique **no mesmo link de novo** → deve dar "link
      inválido ou expirado" (é de uso único, de propósito).

Se os três passaram, **a recuperação de senha está funcionando.**

---

## Passo 6 — Preencher a chave que falta no `.env.local`

### O problema atual

Conferi agora: a variável `SUPABASE_SERVICE_ROLE_KEY` no seu `.env.local`
continua **vazia**:

```
SUPABASE_SERVICE_ROLE_KEY=
```

Sem ela, o teste automático do passo 7 não roda. (Ela também é usada pelo
sistema de pagamento, então vai precisar dela mais cedo ou mais tarde.)

### O que é essa chave

O seu projeto tem duas chaves principais:

- A **anon/publishable** — pública, vai no navegador do usuário, permissões
  limitadas. Essa você já tem (a sua começa com `sb_publishable_`).
- A **service_role** — a chave de administrador. Quem tem ela **ignora todas as
  regras de segurança do banco**. Nunca pode ir para o navegador nem para o Git.

### O que fazer

1. Abra: https://supabase.com/dashboard/project/mtolqhwvpizmaozfaxrn/settings/api

2. Procure a chave **`service_role`** (pode aparecer como "secret"). Clique em
   **Reveal** e copie.

3. No `.env.local`, cole depois do `=`, sem espaços e sem aspas:

   ```
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_... (a chave inteira, é bem longa)
   ```

4. Salve. **Pare o `npm run dev` (Ctrl+C) e rode de novo** — o Next.js só lê o
   `.env.local` quando inicia.

### Segurança

Já verifiquei: seu `.gitignore` tem `.env*.local`, então esse arquivo **não vai
para o Git**. Está seguro.

Mas nunca cole essa chave em: um site, um print, uma conversa, um arquivo dentro
de `src/`, ou uma variável que comece com `NEXT_PUBLIC_` (esse prefixo significa
literalmente "mande isso para o navegador").

---

## Passo 7 — Rodar o teste automático

Existe um script que testa o fluxo inteiro sozinho, em uns 10 segundos. Ele cria
um usuário falso, gera um link de recuperação de verdade (**sem mandar
e-mail**), percorre o caminho completo, confere se a senha mudou mesmo no banco
e no final apaga o usuário falso.

> **Por que ele não pegou o seu erro:** justamente porque ele não manda e-mail.
> Ele testa o seu **código**, e o seu código está bom. A falha do SMTP acontece
> num pedaço que esse teste pula de propósito. Rode-o para garantir que nada
> quebrou, mas não espere que ele valide o conserto do passo 1 — quem faz isso é
> o passo 2.

### O que fazer

Primeiro o passo 6 (a chave). Depois, com o `npm run dev` rodando em um
terminal, abra **outro terminal**:

```bash
cd ~/Desktop/Code/lvl2do
node scripts/test-password-recovery.mjs
```

### O que você deve ver

```
Fluxo de recuperação de senha — http://localhost:3000

  ✓ o link leva para /reset-password
  ✓ cookie de recuperação emitido
  ✓ sessão do Supabase estabelecida
  ✓ /reset-password abre com o link válido
  ✓ servidor recusa senha fora da política
  ✓ senha alterada com sucesso
  ✓ mesmo link não troca a senha duas vezes
  ✓ login com a NOVA senha funciona
  ✓ login com a senha ANTIGA é recusado
  ✓ token de recuperação é de uso único
  ✓ /reset-password é inacessível sem link

Todas as verificações passaram.
```

Cada ✓ verde é uma proteção funcionando. Se aparecer ✗ vermelho, o texto ao lado
diz o que falhou.

### Dica: um atalho para não decorar o comando

Conferi o seu `package.json` e esse atalho **ainda não existe**. Abra o arquivo
e, dentro do bloco `"scripts"`, adicione a última linha:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test:recovery": "node scripts/test-password-recovery.mjs"
}
```

⚠️ Repare na vírgula no final da linha do `lint` — em JSON, todo item precisa de
vírgula, **menos o último**. Depois disso você roda só:

```bash
npm run test:recovery
```

---

## Passo 8 — Salvar o código no Git

O código da recuperação de senha ainda não foi salvo no Git (conferi: as pastas
`src/app/forgot-password/`, `src/app/reset-password/`, `src/lib/auth/`,
`src/components/auth/`, `src/app/api/auth/` e `scripts/` aparecem como novas).
Se seu computador der problema hoje, você perde tudo isso.

```bash
cd ~/Desktop/Code/lvl2do
git add .
git commit -m "Recuperação de senha: fluxo completo com Supabase Auth"
```

Se você tem um repositório no GitHub configurado:

```bash
git push
```

> O `.env.local` **não** vai junto — o `.gitignore` bloqueia. Isso é o correto.
> Quando for publicar, você vai cadastrar essas variáveis direto no painel da
> hospedagem (Vercel, por exemplo), não pelo Git.

---

## Antes de publicar o site — checklist final

- [ ] **Site URL** trocada de `localhost:3000` para o domínio real (passo 4)
- [ ] Domínio real na lista de **Redirect URLs** (passo 4)
- [ ] SMTP com **domínio verificado** no provedor — não o remetente de teste
- [ ] Recuperação testada com o e-mail de **outra pessoa** (não o seu)
- [ ] As variáveis do `.env.local` cadastradas no painel da hospedagem
- [ ] Teste completo feito **no site publicado**, não só no localhost
- [ ] Um e-mail de teste aberto no celular (rede de dados, não no wi-fi de casa)

---

## Problemas comuns

### "500 Error sending recovery email" — o erro de hoje

É o assunto deste guia. O log apontou `535 Authentication failed`: usuário/senha
do SMTP errados. Vá para o [Passo 1](#passo-1--corrigir-o-usuário-e-a-senha-do-smtp).

### Como ler o log do Supabase (você vai voltar aqui)

1. Abra https://supabase.com/dashboard/project/mtolqhwvpizmaozfaxrn/logs/auth-logs
2. Ache a linha mais recente com `status 500` ou nível `error`.
3. Clique nela e leia o campo **`error`**. É esse texto que diz tudo.

A tabela de tradução dos códigos está no [passo 2](#se-ainda-der-500-volte-ao-log).

### "O e-mail não chega" (mas o site diz que enviou)

1. Olhe a caixa de spam.
2. Confirme o remetente: se o **Sender email** for de domínio não verificado, o
   provedor aceita e depois descarta silenciosamente.
3. Olhe o painel do **seu provedor de e-mail** (Resend, SendGrid…) — eles têm uma
   tela de logs mostrando entregues, recusados e marcados como spam.
4. Se testou muitas vezes seguidas, pode ser limite por hora. Espere.

### "Cliquei no link do e-mail e caí na página inicial"

O endereço de retorno não está liberado. Refaça o **passo 4** e confira se as
URLs terminam com `/**`.

### "Link inválido ou expirado" na primeira tentativa

Provavelmente o template do **passo 3** foi colado errado. Compare caractere por
caractere, principalmente `{{ .TokenHash }}` (com espaços, `T` e `H` maiúsculos)
e o `&flow=recovery` no final da URL.

### "Funciona no mesmo navegador, mas não no celular"

É o sintoma clássico do template não ter sido salvo — ou de estar usando
`{{ .ConfirmationURL }}` em vez de `{{ .TokenHash }}`. Volte ao **passo 3**,
cole de novo e clique em **Save**. Recarregue para confirmar que salvou.

### "O link expirou rápido demais"

O padrão é 1 hora. Para mudar: **Authentication** → **Providers** → **Email** →
campo **Email OTP Expiration** (o valor é em segundos: 3600 = 1 hora).

Se mudar, atualize também a frase "O link vale por 1 hora" no template para não
mentir para o usuário.

### "O teste automático diz que falta a SUPABASE_SERVICE_ROLE_KEY"

Faça o **passo 6**. E lembre de reiniciar o `npm run dev` depois de salvar.

---

## Glossário (para não travar na leitura)

| Termo | O que é, em português claro |
|---|---|
| **Supabase Auth** | A parte do Supabase que cuida de login, senha e cadastro. Guarda as senhas em tabelas próprias, separadas das suas. |
| **SMTP** | O "correio" que realmente envia o e-mail. Sem ele, o e-mail não sai da caixa. |
| **535 / 5.7.8** | Código do protocolo de e-mail para "usuário ou senha recusados". É o erro do seu log. |
| **550 / 553** | Códigos para "remetente ou destinatário recusado" — problema diferente, ver passo 2. |
| **Erro 500** | Erro do servidor — quem falhou foi o outro lado, não o seu código. Diferente do 400/401/403, que significam "você pediu errado". |
| **API key** | Uma senha longa gerada por um serviço, para programas usarem no lugar de login e senha humanos. |
| **Template** | O modelo do e-mail, com "espaços em branco" (`{{ }}`) que o Supabase preenche na hora de enviar. |
| **Token** | Um código secreto, longo e único, gerado para um pedido específico. É o que vai dentro do link do e-mail. |
| **Cookie** | Um bilhetinho que o site guarda no navegador para lembrar de algo entre uma página e outra. |
| **httpOnly** | Um cookie que o JavaScript da página **não consegue ler**. Serve para o navegador não poder ser enganado por código malicioso. |
| **Middleware** | Um "porteiro" que roda antes de cada página e decide se a pessoa pode entrar. |
| **`.env.local`** | Arquivo com as senhas e chaves do projeto. Fica só no seu computador, nunca no Git. |
| **Rate limit** | Um limite de "quantas vezes por hora" você pode fazer algo. Existe para impedir abuso. Aparece como erro `429`. |
| **PKCE / OTP** | Dois jeitos diferentes de montar o link do e-mail. O PKCE só funciona no mesmo navegador; o OTP funciona em qualquer aparelho. O passo 3 troca de um para o outro. |

---

## Resumo em quatro linhas

1. O log resolveu o mistério: **`535 Authentication failed`** — o servidor de
   e-mail recusou o usuário e a senha do SMTP.
2. O conserto é o **passo 1**, e o suspeito nº 1 é o campo **Username**: no
   Resend ele é a palavra `resend`, no SendGrid é `apikey` — não o seu e-mail.
3. **Não mexa no Host nem na Port** — o log provou que estão certos, porque a
   conexão chegou a acontecer.
4. Template, código e banco de dados estão inocentes. É só configuração.

> Explicação técnica de como o fluxo funciona por dentro, decisões de segurança
> e lista de arquivos: veja [recuperacao-senha.md](recuperacao-senha.md).
