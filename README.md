# lvl2do — Seu desenvolvimento em jogo 🎮

App de **checklist gamificado**: transforme tarefas em missões, ganhe XP ao concluir
atividades, suba de nível e acompanhe sua evolução diária/semanal.

> **Status atual:** apenas **front-end / base visual** com dados mockados.
> Autenticação (Clerk) e banco de dados serão integrados futuramente.

---

## 🚀 Como rodar o projeto

```bash
# 1. Instalar dependências
npm install

# 2. Ambiente de desenvolvimento
npm run dev
# abre em http://localhost:3000

# 3. Build de produção
npm run build
npm run start
```

Não há variáveis de ambiente obrigatórias no momento (veja `.env.example`).

---

## 🧱 Stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS** (design tokens da marca em `tailwind.config.ts`)
- **Framer Motion** (animações)
- **Lucide React** (ícones)
- **Recharts** (gráfico de XP por semana)
- `clsx` + `tailwind-merge` → helper `cn()`

---

## 📂 Arquivos principais

```
src/
├─ app/
│  ├─ layout.tsx              # layout raiz + fonts (Sora/Manrope). [Futuro: <ClerkProvider>]
│  ├─ globals.css             # tema, design-system (card-surface, glow, text-gradient)
│  ├─ page.tsx                # / — Landing page
│  ├─ login/page.tsx          # /login — placeholder visual (futuro Clerk)
│  ├─ register/page.tsx       # /register — placeholder visual (futuro Clerk)
│  └─ (app)/                  # grupo de rotas internas (sidebar + bottom nav)
│     ├─ layout.tsx           # layout interno [Futuro: proteção via Clerk Middleware]
│     ├─ dashboard/page.tsx   # /dashboard
│     ├─ missions/page.tsx    # /missions
│     ├─ progress/page.tsx    # /progress
│     └─ profile/page.tsx     # /profile
│
├─ components/                # componentes reutilizáveis (Header, Sidebar, MissionCard, etc.)
│  └─ charts/XpAreaChart.tsx  # gráfico Recharts
│
├─ data/                      # dados mockados + tipos
│  ├─ types.ts                # Category, Difficulty, Mission, XP_BY_DIFFICULTY
│  ├─ mockMissions.ts
│  ├─ mockStats.ts
│  ├─ navigation.ts
│  └─ landingContent.ts
│
├─ hooks/useMissions.ts       # estado local das missões (sem persistência)
└─ lib/
   ├─ utils.ts                # cn(), clamp(), toPercent()
   └─ animations.ts           # variants Framer Motion reutilizáveis
```

---

## 🔐 Onde aplicar o Clerk no futuro

A base já está preparada. Ao integrar (seguindo o **prompt/documentação oficial do Clerk**):

1. `npm install @clerk/nextjs`
2. Configurar `.env.local` (ver `.env.example`):
   `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
3. Envolver o app com `<ClerkProvider>` em `src/app/layout.tsx` (já há comentário indicando o local).
4. Substituir as telas placeholder:
   - `src/app/login/page.tsx` → `<SignIn />`
   - `src/app/register/page.tsx` → `<SignUp />`
5. Trocar os atalhos de "Sair" (`Sidebar.tsx`, `AppTopbar.tsx`) por `<UserButton />` / `<SignOutButton />`.
6. Ativar o middleware: renomear **`middleware.example.ts` → `middleware.ts`** (já contém o exemplo pronto).

### Rotas que serão protegidas pelo Clerk

- `/dashboard`
- `/missions`
- `/progress`
- `/profile`

(As rotas públicas `/`, `/login` e `/register` permanecem abertas.)

---

## 🗄️ Onde integrar banco de dados no futuro

Toda a leitura/escrita hoje passa por uma fina camada mock — fácil de substituir:

- **Dados mockados:** `src/data/mockMissions.ts`, `src/data/mockStats.ts`
- **Estado das missões:** `src/hooks/useMissions.ts` (substituir `useState` por
  fetch/mutations reais — ex.: Server Actions + Prisma, ou Supabase).
- **Criação de missão:** `NewMissionModal` → `onCreate` (hoje só adiciona em memória).

---

## 🧭 Próximos passos técnicos

1. Integrar **Clerk** (auth + proteção de rotas) seguindo o prompt oficial.
2. Adicionar **banco de dados** (Prisma/Supabase) e schema de `users`, `missions`, `xp_events`.
3. Persistir missões: concluir/criar passa a gravar no banco e recalcular XP/nível no servidor.
4. Cálculo real de **streak**, **level up** e **análises** por categoria.
5. Implementar o plano **Pro** (relatórios avançados, temas, análises inteligentes).
6. Testes (unit/E2E) e telemetria.

---

© 2026 lvl2do — projeto de portfólio.
