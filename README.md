# lvl2do — Transforme sua rotina em uma jornada de RPG 🎮

App de **produtividade gamificada**: transforme tarefas em missões, ganhe **XP** ao concluí-las,
suba de nível, evolua seu personagem, mantenha o **streak** e acompanhe sua evolução com
dashboards e métricas.

> **Status atual:** front-end completo com **autenticação Clerk integrada** (login, registro,
> proteção de rotas e onboarding). A camada de dados do app ainda é **mockada** — o banco de
> dados será integrado depois. A **classe** e a **identidade (nickname + hashtag)** do jogador já
> são persistidas na conta (Clerk `unsafeMetadata`).

---

## 🚀 Como rodar o projeto

```bash
# 1. Instalar dependências
npm install

# 2. Variáveis de ambiente (Clerk) — crie um .env.local
#    Pegue as chaves no painel do Clerk (clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# 3. Ambiente de desenvolvimento
npm run dev          # http://localhost:3000

# 4. Build de produção
npm run build
npm run start
```

> ⚠️ As chaves do **Clerk** são **obrigatórias** agora — o middleware protege todas as rotas
> internas. Sem elas, as páginas autenticadas não carregam.

---

## 🧱 Stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS** (design tokens da marca em `tailwind.config.ts`)
- **Clerk** (`@clerk/nextjs`) — autenticação e proteção de rotas
- **Framer Motion** — animações
- **Lucide React** — ícones
- **Recharts** — gráfico de XP
- `clsx` + `tailwind-merge` → helper `cn()`

---

## ✨ Funcionalidades

- **Missões & XP:** crie missões por categoria (Profissional/Pessoal/Saúde), turno e dificuldade;
  concluir credita XP em tempo real em todo o app (estado global).
- **Personagem & Classes:** escolha entre 5 classes (Guerreiro, Ladrão, Arqueira, Bruxa, Bardo);
  a arte **evolui por faixa de nível** (lv1, 10, 25, 50, 100) e há **skins** trocáveis.
- **Identidade:** **nickname + hashtag** (`Nick#ABC`) — o nick pode repetir, a hashtag de 3
  caracteres torna o par único.
- **Streak:** indicador de dias consecutivos no dashboard (multiplicadores de XP previstos).
- **Modo Focus:** timer estilo Pomodoro.
- **Alarmes:** alarmes com som e dias da semana, com disparo/notificação.
- **Métricas/Progresso:** gráfico de XP, calendário e desempenho por categoria/período.
- **Amigos:** adicionar, remover e ver perfil (nível, streak, classe, país).
- **Ranking:** Global e de Amigos, com períodos "Todos os tempos" e "Anual" + bandeira do país.
- **Indicações & Cristais:** convide novos jogadores → ganhe **cristais de energia**; metas por
  temporada (6 meses) — bloco compacto dentro do **Perfil**.
- **Loja:** troque cristais por **produtos físicos** (12 itens).
- **Suporte:** abertura e acompanhamento de tickets.
- **Notificações:** central no app (level up, alertas, etc.).

---

## 🔐 Autenticação & proteção de rotas (Clerk)

- **Provider:** `<ClerkProvider>` em `src/app/layout.tsx`.
- **Middleware:** `src/middleware.ts` — rotas **públicas**: `/`, `/login`, `/register`. Todo o
  resto exige login.
- **Login/Registro:** telas do Clerk em `src/app/login/[[...rest]]` e `src/app/register/[[...rest]]`.
- **Onboarding (`/onboarding`):** no **primeiro login**, o jogador define **nickname + hashtag** e
  **escolhe a classe** (salvos no `unsafeMetadata`). O `ClassGuard` redireciona para cá quem ainda
  não tem classe.

---

## 📂 Estrutura principal

```
src/
├─ app/
│  ├─ layout.tsx              # <ClerkProvider> + fonts (Sora/Manrope)
│  ├─ page.tsx                # / — Landing (Hero, Problema×Sistema, Classes, Planos, FAQ, Footer)
│  ├─ login / register        # telas do Clerk (rotas catch-all)
│  ├─ onboarding/page.tsx     # 1º login: nickname+hashtag + classe
│  └─ (app)/                  # rotas internas (sidebar + bottom nav), protegidas
│     ├─ layout.tsx           # AppStateProvider + ClassGuard + Sidebar/BottomNav
│     ├─ dashboard            # /dashboard
│     ├─ missions             # /missions
│     ├─ alarms               # /alarms
│     ├─ focus                # /focus
│     ├─ progress             # /progress (métricas)
│     ├─ friends              # /friends
│     ├─ ranking              # /ranking
│     ├─ store                # /store (loja de cristais)
│     ├─ profile              # /profile (inclui indicações + editar identidade)
│     └─ support              # /support
│
├─ components/                # ~60 componentes de UI (cards, modais, charts, etc.)
├─ data/                      # tipos + dados mock + conteúdo
│  ├─ types.ts, mockMissions.ts, mockStats.ts, metricsData.ts
│  ├─ characterClasses.ts     # classes, skins e arte por nível
│  ├─ identity.ts             # validação/unicidade de nickname#hashtag (mock)
│  ├─ social.ts               # amigos + ranking (mock) + países
│  ├─ referral.ts             # indicações, cristais e temporada
│  ├─ store.ts                # produtos da loja
│  ├─ alarms.ts, focus.ts, landingContent.ts, navigation.ts
│
├─ hooks/
│  ├─ AppStateProvider.tsx    # estado global (XP/missões/alarmes/notificações)
│  ├─ useUserStats.ts, useMissions.ts
│  ├─ useCharacterClass.ts, useCharacterSkin.ts, useProfileIdentity.ts
│  ├─ useFocusTimer.ts, useAlarms.ts, useAlarmScheduler.ts, useAlarmSound.ts
│  └─ useNotifications.ts, useTickets.ts
│
└─ lib/
   ├─ xp-system.ts            # cálculo de XP/nível
   ├─ utils.ts                # cn(), clamp(), toPercent()
   ├─ animations.ts           # variants de Framer Motion
   └─ alarm-sounds.ts
```

A arte dos personagens fica em `public/characters` como `<slug>lv<faixa>.webp`.

---

## 🗄️ Onde os dados ainda são mock (integrar banco depois)

A leitura/escrita do app passa por uma camada mock fácil de substituir:

- **Missões/Stats:** `src/data/mockMissions.ts`, `src/data/mockStats.ts`, `src/data/metricsData.ts`.
- **Estado de XP/missões:** `src/hooks/useUserStats.ts` + `useMissions.ts` (via `AppStateProvider`).
- **Social / Ranking / Indicações / Loja:** `src/data/social.ts`, `referral.ts`, `store.ts`
  (saldo de cristais, amigos, ranking e produtos são mock — sem persistência real).
- **Identidade/Classe:** já persistidas no Clerk (`unsafeMetadata`); a **unicidade** do
  `nickname#hashtag` é validada contra um conjunto mock (`identity.ts`) até existir backend.

---

## 🧭 Próximos passos técnicos

1. **Banco de dados** (Prisma/Supabase): `users`, `missions`, `xp_events`, `friends`, `referrals`,
   `crystals`, `orders`.
2. Persistir missões, XP, streak, cristais e indicações (hoje em memória/mock).
3. Cálculo real de **streak** + **multiplicadores** e validação de **unicidade** de identidade no servidor.
4. **Pagamentos/assinatura** (Stripe) e confirmação das indicações (cobrança após 15 dias).
5. Notificações push reais e telemetria.
6. Testes (unit/E2E).

---

## 📚 Documentação

A pasta [`docs/`](docs) reúne a descrição do produto e os backlogs de ideias:

- `sobre.md` — visão geral do produto.
- `updesigner1.md`, `updesigner2.md` — 200 melhorias de design (visual).
- `upfuncionalidade1.md` … `upfuncionalidade4.md` — 400 ideias de funcionalidade.

---

© 2026 lvl2do — projeto de portfólio.
