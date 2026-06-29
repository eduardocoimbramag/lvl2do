# lvl2do — Transforme sua rotina em uma jornada de RPG 🎮

App de **produtividade gamificada**: transforme tarefas em missões, ganhe **XP** ao concluí-las,
suba de nível, evolua seu personagem, mantenha o **streak** e acompanhe sua evolução com
dashboards e métricas.

> **Status atual:** front-end completo com **backend Supabase integrado** — autenticação
> (e-mail + senha), proteção de rotas, e persistência real por usuário (RLS) de **missões, XP,
> nível, streak, XP diário, métricas, amigos, ranking, loja e indicações**. Uma conta nova começa
> **zerada** (0 XP, nível 1, streak 0, sem missões) e evolui conforme o uso.

---

## 🚀 Como rodar o projeto

```bash
# 1. Instalar dependências
npm install

# 2. Variáveis de ambiente (Supabase) — crie um .env.local
NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<sua-anon/publishable-key>

# 3. Ambiente de desenvolvimento
npm run dev          # http://localhost:3000

# 4. Build de produção
npm run build
npm run start
```

### Banco de dados (Supabase)

No **SQL Editor** do Supabase, rode os scripts da pasta [`supabase/`](supabase) **nesta ordem**:

1. `schema.sql` — tabelas base `profiles` e `missions`, RLS, triggers e criação automática de perfil.
2. `2026-progress-streak.sql` — XP diário persistido (`daily_xp`) + log **`xp_events`** (base das métricas).
3. `2026-social.sql` — view `public_profiles`, tabelas `friendships` / `redemptions` / `referrals`,
   colunas `crystals` / `country` / `referral_code` / `year_xp`, RPCs e atribuição de indicação.

> `fix-profiles.sql` existe como reparo idempotente caso a tabela `profiles` tenha sido criada antes
> das colunas de identidade (nickname/tag).

> ⚠️ As chaves do **Supabase** são **obrigatórias** — o middleware protege as rotas internas e
> sem o banco migrado as telas sociais/métricas ficam vazias.

---

## 🧱 Stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS** (design tokens da marca em `tailwind.config.ts`)
- **Supabase** — Auth (e-mail/senha), Postgres + **RLS**, `@supabase/ssr` e `@supabase/supabase-js`
- **Framer Motion** — animações
- **Lucide React** — ícones
- **Recharts** — gráfico de XP
- `clsx` + `tailwind-merge` → helper `cn()`

---

## ✨ Funcionalidades

- **Missões & XP:** crie missões por categoria (Profissional/Pessoal/Saúde), turno e dificuldade;
  concluir credita XP em tempo real e **persiste no banco** (com limite diário de XP).
- **Personagem & Classes:** escolha entre 5 classes (Guerreiro, Ladrão, Arqueira, Bruxa, Bardo);
  a arte **evolui por faixa de nível** (lv1, 10, 25, 50, 100) e há **skins** trocáveis.
- **Identidade:** **nickname + hashtag** (`Nick#ABC`) — o nick pode repetir; a hashtag de 3
  caracteres torna o par único (garantido por `unique(nickname, tag)` no banco).
- **Streak real:** dias consecutivos com ao menos uma missão concluída — avança 1×/dia, persiste
  em `profiles` e alimenta o indicador do dashboard.
- **Métricas/Progresso:** XP por dia/semana/mês, missões concluídas e desempenho por categoria,
  derivados do log real `xp_events`.
- **Modo Focus:** timer estilo Pomodoro.
- **Alarmes:** alarmes com som e dias da semana, com disparo/notificação (estado local).
- **Amigos:** busca por `Nick#TAG`, adicionar (amizade mútua), remover e ver perfil.
- **Ranking:** Global e de Amigos × "Todos os tempos" (`total_xp`) e "Anual" (`year_xp`); layout
  50/50 (pódio + classificação rolável com a **sua posição fixa**) e bandeira do país.
- **Indicações & Cristais:** link `…/register?ref=CÓDIGO` real; novos cadastros via convite creditam
  **+15 cristais** ao indicador. Metas por temporada (6 meses) — bloco compacto no **Perfil**.
- **Loja:** troque cristais por **produtos físicos** (12 itens) — débito atômico via RPC.
- **Suporte:** abertura e acompanhamento de tickets (estado local).
- **Notificações:** central no app (level up, alertas, etc. — estado local).

---

## 🔐 Autenticação & proteção de rotas (Supabase)

- **Provider:** `<AuthProvider>` (`src/components/AuthProvider.tsx`) expõe `user`, `profile`,
  `loading`, `refreshProfile`, `signOut` via `onAuthStateChange`.
- **Middleware:** `src/middleware.ts` → `updateSession` (`src/lib/supabase/middleware.ts`) renova a
  sessão e protege rotas. **Públicas:** `/`, `/login`, `/register`, `/auth`.
- **Login/Registro:** telas próprias em `src/app/login` e `src/app/register` (e-mail + senha). O
  registro captura `?ref=CÓDIGO` para indicações.
- **Onboarding (`/onboarding`):** no **primeiro login**, o jogador define **nickname + hashtag** e
  **escolhe a classe** (salvos em `profiles`). O `ClassGuard` redireciona para cá quem ainda não tem classe.

---

## 📂 Estrutura principal

```
src/
├─ app/
│  ├─ layout.tsx              # <AuthProvider> + fonts (Sora/Manrope)
│  ├─ page.tsx                # / — Landing (Hero, Problema×Sistema, Classes, Planos, FAQ, Footer)
│  ├─ login / register        # telas de e-mail + senha (Supabase Auth)
│  ├─ auth/callback           # troca de código de confirmação de e-mail
│  ├─ onboarding/page.tsx     # 1º login: nickname+hashtag + classe
│  └─ (app)/                  # rotas internas (sidebar + bottom nav), protegidas
│     ├─ layout.tsx           # AppStateProvider + ClassGuard + Sidebar/BottomNav
│     ├─ dashboard, missions, alarms, focus, progress
│     ├─ friends, ranking, store
│     ├─ profile              # inclui indicações + editar identidade
│     └─ support
│
├─ components/                # ~60 componentes de UI (cards, modais, charts, etc.)
│  └─ AuthProvider.tsx        # contexto de sessão/perfil (Supabase)
│
├─ data/                      # tipos + regras + conteúdo
│  ├─ types.ts, mockStats.ts (apenas fallbacks de nome/tag)
│  ├─ characterClasses.ts     # classes, skins e arte por nível
│  ├─ identity.ts             # validação de formato de nickname#hashtag
│  ├─ social.ts               # tipos de jogador/ranking + países
│  ├─ referral.ts             # regras de indicação, cristais e temporada
│  ├─ store.ts, metricsData.ts (tipos), alarms.ts, focus.ts, landingContent.ts, navigation.ts
│
├─ hooks/
│  ├─ AppStateProvider.tsx    # estado global (XP/missões/streak/alarmes/notificações)
│  ├─ useUserStats.ts, useMissions.ts, useStreak.ts, useMetrics.ts
│  ├─ useCharacterClass.ts, useCharacterSkin.ts, useProfileIdentity.ts
│  ├─ useFocusTimer.ts, useAlarms.ts, useAlarmScheduler.ts, useAlarmSound.ts
│  └─ useNotifications.ts, useTickets.ts
│
├─ lib/
│  ├─ supabase/               # client.ts, server.ts, middleware.ts
│  ├─ db/                     # profiles.ts, missions.ts, xpEvents.ts, social.ts
│  ├─ xp-system.ts            # cálculo de XP/nível (funções puras)
│  ├─ streak.ts               # cálculo de streak (funções puras)
│  ├─ utils.ts, animations.ts, alarm-sounds.ts
│
└─ types/database.ts          # tipos das linhas do banco (ProfileRow, MissionRow, …)
```

A arte dos personagens fica em `public/characters` como `<slug>lv<faixa>.webp`.

---

## 🗄️ Modelo de dados (Supabase)

- **`profiles`** (1:1 com `auth.users`): identidade (nickname/tag), classe/skin, `total_xp`,
  `level`, `daily_xp`, streak, `country`, `crystals`, `referral_code`, `year_xp`. `unique(nickname, tag)`.
- **`missions`**: missões por usuário (categoria, dificuldade, turno, agendamento, status, XP).
- **`xp_events`**: log append-only de ganhos/reversões de XP (base das métricas + `year_xp`).
- **`friendships`**: amizade mútua (2 linhas por par); criada/removida via RPC `add_friend`/`remove_friend`.
- **`redemptions`**: resgates da loja; débito atômico via RPC `redeem_product`.
- **`referrals`**: indicações; `handle_new_user` atribui o convite e credita cristais.
- **view `public_profiles`**: colunas públicas (ranking/amigos) — `crystals`/`referral_code` ficam privados.

Tudo protegido por **RLS** (`auth.uid()`); leituras sociais passam pela view; operações sensíveis
(amizade, resgate) por funções `security definer`.

---

## ⏳ Pontos ainda simplificados

- **Indicações:** a confirmação acontece no cadastro (sem o gate real de 15 dias / cobrança).
- **País:** padrão `'br'` para todos (coluna existe, mas ainda sem seletor em "Editar perfil").
- **Alarmes, notificações, tickets:** estado local (ainda não persistidos no banco).
- **Conteúdo da landing** é estático.

---

## 🧭 Próximos passos técnicos

1. Confirmação real das indicações (cobrança/retenção de 15 dias) + **pagamentos** (Stripe).
2. Seletor de **país** e persistência de **alarmes/notificações/tickets**.
3. Multiplicadores de XP por faixa de streak (7 dias = 1,2× · 30 dias = 1,5×).
4. Notificações push reais e telemetria.
5. Testes (unit/E2E).

---

## 📚 Documentação

A pasta [`docs/`](docs) reúne a descrição do produto e os backlogs de ideias:

- `sobre.md` — visão geral do produto.
- `updesigner1.md`, `updesigner2.md` — 200 melhorias de design (visual).
- `upfuncionalidade1.md` … `upfuncionalidade4.md` — 400 ideias de funcionalidade.

---

© 2026 lvl2do — projeto de portfólio.
