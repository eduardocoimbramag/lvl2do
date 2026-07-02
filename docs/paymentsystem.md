# Sistema de Pagamento — Integração RevenueCat (passo a passo)

> **Objetivo:** transformar a estrutura de paywall/acesso já existente (frontend
> + regras) na integração **real** de assinatura, com RevenueCat como provedor,
> Supabase como fonte de verdade do acesso, e cristais liberando 1 dia.
>
> **Pré-requisito:** a etapa de frontend já está pronta. Esta doc parte dela:
> - `src/data/subscription.ts` — plano PRO (`entitlement: "pro"`, `R$ 14,90`, 14 dias).
> - `src/lib/access/accessRules.ts` — regras puras (`canAccessApp`, etc.).
> - `src/lib/payments/revenuecat.ts` — **placeholders** a serem implementados.
> - `src/hooks/useAccessGate.ts` — estado do paywall (com simulação só em dev).
> - `src/components/AccessGuard.tsx` + `src/app/paywall/page.tsx` — gate client-side.
> - `src/types/database.ts` — colunas de assinatura já previstas como **opcionais**.

**Ordem recomendada:** 1) Banco → 2) SDK → 3) Webhook → 4) Hook → 5) Guard server-side.
Faça e teste um passo por vez.

---

## 0. Conceito da arquitetura

```
RevenueCat (provedor)  ──webhook──►  /api/webhooks/revenuecat  ──►  profiles.subscription_*
        ▲                                                              │
        │ purchasePackage / getCustomerInfo                            │ (fonte de verdade)
        │                                                              ▼
   revenuecat.ts (SDK)  ◄── useAccessGate ──►  AccessGuard / middleware  ──►  libera o app
```

- **RevenueCat** processa a compra e emite eventos.
- **O webhook** grava o status no `profiles` (Supabase) — **fonte de verdade**.
- **O `AccessGuard`/middleware** lê o `profiles` (via `useAccessGate`/server) e libera.
- **Cristais** continuam no Supabase; `consume_daily_crystal` libera 1 dia.

Regra de ouro: **nunca confie só no cliente** para liberar acesso. O cliente dá
uma resposta rápida (otimista), mas a verdade é o `profiles` atualizado pelo
webhook e revalidado no servidor.

---

## 1. Banco (Supabase SQL) — colunas + RPC de cristal

Crie o arquivo `supabase/2026-subscription.sql` e rode no **SQL Editor**.
Segue o mesmo padrão das RPCs existentes (`security definer`, `for update`,
`grant execute ... to authenticated`).

```sql
-- ============================================================
-- lvl2do — assinatura (RevenueCat) + consumo diário de cristal
-- Idempotente. Rode no SQL Editor do Supabase.
-- ============================================================

-- 1) Colunas de assinatura no profile (os tipos TS já as preveem).
alter table public.profiles add column if not exists plan text;
alter table public.profiles add column if not exists subscription_status text;      -- active | trialing | expired | canceled
alter table public.profiles add column if not exists subscription_expires_at timestamptz;
alter table public.profiles add column if not exists last_crystal_access_date date;
-- (opcional) id do cliente no RevenueCat, para casar webhook ↔ usuário:
alter table public.profiles add column if not exists rc_app_user_id text;

create index if not exists profiles_rc_app_user_id_idx on public.profiles(rc_app_user_id);

-- 2) RPC atômica: consumir 1 cristal para liberar o DIA de hoje.
--    - idempotente por dia: se já liberou hoje, não debita de novo.
--    - debita 1 cristal e grava last_crystal_access_date = hoje.
--    - retorna o saldo restante de cristais.
create or replace function public.consume_daily_crystal()
returns integer language plpgsql security definer set search_path = public as $$
declare
  bal int;
  last_day date;
  today date := (now() at time zone 'utc')::date;  -- ajuste o fuso se necessário
begin
  select crystals, last_crystal_access_date
    into bal, last_day
    from public.profiles
    where id = auth.uid()
    for update;

  if bal is null then raise exception 'profile not found'; end if;

  -- já liberou hoje → não cobra de novo (idempotente)
  if last_day = today then
    return bal;
  end if;

  if bal < 1 then raise exception 'insufficient crystals'; end if;

  update public.profiles
    set crystals = crystals - 1,
        last_crystal_access_date = today
    where id = auth.uid();

  return bal - 1;
end; $$;

grant execute on function public.consume_daily_crystal() to authenticated;

-- 3) recarrega o cache do PostgREST (evita PGRST204 pós-migração)
notify pgrst, 'reload schema';
```

> **Fuso:** o app usa data LOCAL (`getLocalDateKey`). Se seus usuários são só do
> Brasil, troque `at time zone 'utc'` por `at time zone 'America/Sao_Paulo'` para
> o "dia" bater com o cliente. O ideal (fase 2) é passar a data local do cliente
> como argumento da RPC.

**Teste:** no SQL Editor, `select public.consume_daily_crystal();` autenticado
como um usuário com cristais → deve debitar 1 e gravar a data; rodar de novo no
mesmo dia → retorna o saldo sem debitar.

---

## 2. SDK — implementar `src/lib/payments/revenuecat.ts`

O lvl2do é **web** (Next.js). Use o **RevenueCat Web Billing** (`@revenuecat/purchases-js`).
(Para app mobile/wrapper, use `react-native-purchases` — a "forma" das funções é a mesma.)

```bash
npm install @revenuecat/purchases-js
```

`.env.local`:
```
NEXT_PUBLIC_REVENUECAT_WEB_API_KEY=rcb_xxx        # public web billing key
REVENUECAT_WEBHOOK_SECRET=whsec_xxx               # segredo do webhook (server-only)
SUPABASE_SERVICE_ROLE_KEY=eyJ...                  # server-only, NUNCA no cliente
```

Implemente as **mesmas assinaturas** já usadas pela UI (não mude os tipos):

```ts
// src/lib/payments/revenuecat.ts
import { Purchases } from "@revenuecat/purchases-js";
import { PRO_ENTITLEMENT } from "@/data/subscription";

let configured = false;

/** Configura o SDK uma vez, com o app_user_id = id do usuário Supabase. */
export function ensureConfigured(appUserId: string) {
  if (configured) return;
  Purchases.configure({
    apiKey: process.env.NEXT_PUBLIC_REVENUECAT_WEB_API_KEY!,
    appUserId, // casa o cliente RevenueCat com o usuário (use o auth.uid do Supabase)
  });
  configured = true;
}

export async function startRevenueCatCheckout(): Promise<CheckoutResult> {
  try {
    const offerings = await Purchases.getSharedInstance().getOfferings();
    const pkg = offerings.current?.availablePackages?.[0];
    if (!pkg) return { ok: false, status: "error", message: "Nenhum plano disponível." };

    const { customerInfo } = await Purchases.getSharedInstance().purchasePackage(pkg);
    const active = !!customerInfo.entitlements.active[PRO_ENTITLEMENT];
    return active
      ? { ok: true, status: "purchased" }
      : { ok: false, status: "error", message: "Compra não ativou o entitlement." };
  } catch (e: unknown) {
    // usuário cancelou vs erro real
    const cancelled = (e as { userCancelled?: boolean })?.userCancelled;
    return { ok: false, status: cancelled ? "cancelled" : "error" };
  }
}

export async function refreshRevenueCatEntitlement(): Promise<EntitlementState> {
  const info = await Purchases.getSharedInstance().getCustomerInfo();
  const ent = info.entitlements.active[PRO_ENTITLEMENT];
  return {
    active: !!ent,
    entitlement: PRO_ENTITLEMENT,
    expiresAt: ent?.expiresDate ?? null,
  };
}
```

> Mantenha os tipos `CheckoutResult` / `EntitlementState` que já existem no
> arquivo — só troque o **corpo** das funções.

**No RevenueCat Dashboard:** crie um **Entitlement** com identificador exatamente
`pro` (== `PRO_ENTITLEMENT`), um **Product** (assinatura mensal R$ 14,90 com 14
dias de trial) e uma **Offering** com um Package apontando para esse product.

---

## 3. Webhook — `src/app/api/webhooks/revenuecat/route.ts`

O webhook é a **fonte de verdade**: recebe eventos do RevenueCat e atualiza o
`profiles`. Use a **service role key** (server-only) para escrever ignorando RLS,
pois o webhook não roda no contexto do usuário.

```ts
// src/app/api/webhooks/revenuecat/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // precisa da service key (não Edge)

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only
  { auth: { persistSession: false } },
);

export async function POST(req: Request) {
  // 1) autentica o webhook (Authorization header configurado no RevenueCat)
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const event = body?.event;
  if (!event) return NextResponse.json({ ok: true });

  // 2) descobre o usuário: app_user_id == auth.uid() do Supabase (ver passo 2)
  const appUserId: string | undefined =
    event.app_user_id ?? event.original_app_user_id;
  if (!appUserId) return NextResponse.json({ ok: true });

  // 3) mapeia o tipo de evento para o status da assinatura
  const type: string = event.type; // INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, ...
  const proActive =
    ["INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"].includes(type);
  const inTrial = event.period_type === "TRIAL";
  const expiresMs: number | null = event.expiration_at_ms ?? null;

  const status = proActive ? (inTrial ? "trialing" : "active")
    : type === "CANCELLATION" ? "canceled"
    : type === "EXPIRATION" ? "expired"
    : null;

  if (!status) return NextResponse.json({ ok: true });

  // 4) grava no profiles (fonte de verdade do AccessGuard)
  await admin
    .from("profiles")
    .update({
      plan: "pro",
      subscription_status: status,
      subscription_expires_at: expiresMs ? new Date(expiresMs).toISOString() : null,
    })
    .eq("id", appUserId); // requer app_user_id == profiles.id (== auth.uid)

  return NextResponse.json({ ok: true });
}
```

**No RevenueCat Dashboard → Integrations → Webhooks:** aponte para
`https://SEU_DOMINIO/api/webhooks/revenuecat` e configure o header
`Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`.

> **Casamento usuário↔evento:** garanta que o `appUserId` passado no
> `Purchases.configure({ appUserId })` (passo 2) seja o **`auth.uid()` do
> Supabase**. Assim `.eq("id", appUserId)` acerta o profile. Se preferir não
> expor o uid, grave `rc_app_user_id` no profile e busque por ele.

**Teste:** use "Send test event" no dashboard do RevenueCat e confira se o
`profiles` do usuário-teste foi atualizado.

---

## 4. Hook — `src/hooks/useAccessGate.ts` (fluxo real)

Troque a simulação de dev pelo fluxo real, mantendo a mesma API pública (a UI
não muda). Pontos a alterar:

1. **`startCheckout`**: já chama `startRevenueCatCheckout()`. Depois de uma compra
   `ok`, chame `refreshProfile()` do `useAuth` (o webhook pode levar 1-2s; para
   UX imediata, você pode também setar um estado otimista e revalidar).

2. **`useCrystalForToday`**: trocar a simulação por uma RPC real:
   ```ts
   const { refreshProfile } = useAuth();
   const useCrystalForToday = useCallback(async () => {
     const supabase = createClient();
     const { error } = await supabase.rpc("consume_daily_crystal");
     if (error) { console.error(error); return; }
     await refreshProfile(); // relê last_crystal_access_date/crystals → hasAccess vira true
   }, [refreshProfile]);
   ```
   Como o `AccessGuard`/paywall derivam de `profile`, após o `refreshProfile()` o
   acesso é reavaliado e o app libera.

3. **Remover a dependência de dev:** o bloco `IS_DEV`/`localStorage` pode
   permanecer **apenas** como atalho de desenvolvimento (já é ignorado em
   produção via `IS_DEV`). Em produção, `accessData` vem 100% do `profile`.
   Se preferir, remova `devBypass` do `accessData` quando o fluxo real estiver
   estável — mas não é obrigatório (produção já não o ativa).

4. **Configurar o SDK:** ao montar o app autenticado, chame
   `ensureConfigured(user.id)` uma vez (ex.: num efeito no `AuthProvider` ou num
   provider de pagamento), para `getCustomerInfo`/`purchasePackage` funcionarem.

> O `useAccessGate` **já sincroniza instâncias** via evento; ao trocar por
> `refreshProfile()`, a atualização do `profile` propaga para todas as
> instâncias pelo próprio `AuthProvider`.

---

## 5. Guard server-side (defesa em profundidade)

O `AccessGuard` client-side dá boa UX, mas pode ser burlado. Replique a checagem
no **middleware** (`src/lib/supabase/middleware.ts`), que já roda com a sessão do
usuário e já protege login. Depois do `getUser()`:

```ts
// dentro de updateSession, após obter `user` e antes do return:
const PROTECTED_PREFIXES = ["/dashboard","/missions","/alarms","/focus",
  "/progress","/friends","/ranking","/store","/profile","/support"];
const needsAccess = PROTECTED_PREFIXES.some(p => pathname === p || pathname.startsWith(p + "/"));

if (user && needsAccess) {
  const { data: p } = await supabase
    .from("profiles")
    .select("subscription_status, subscription_expires_at, last_crystal_access_date")
    .eq("id", user.id)
    .single();

  // reusa as MESMAS regras puras do cliente:
  const hasAccess = canAccessApp({
    subscriptionStatus: p?.subscription_status,
    subscriptionExpiresAt: p?.subscription_expires_at,
    lastCrystalAccessDate: p?.last_crystal_access_date,
  });

  if (!hasAccess) {
    const url = request.nextUrl.clone();
    url.pathname = "/paywall";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
}
```

> Importa `canAccessApp` de `@/lib/access/accessRules` — **as mesmas regras** do
> cliente, garantindo consistência. Mantenha `/paywall` e `/onboarding` fora dos
> prefixos protegidos (senão vira loop). Cuidado com o custo: é 1 query por
> request em rota protegida — aceitável; se quiser, cacheie por curtos segundos.

---

## 6. Checklist de implementação
- [ ] **Banco:** rodar `2026-subscription.sql` (colunas + `consume_daily_crystal`).
- [ ] **RevenueCat:** criar Entitlement `pro`, Product mensal (14 dias trial), Offering.
- [ ] **Env:** `NEXT_PUBLIC_REVENUECAT_WEB_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] **SDK:** implementar `revenuecat.ts` + `ensureConfigured(user.id)` no boot.
- [ ] **Webhook:** `/api/webhooks/revenuecat` + configurar URL/segredo no dashboard.
- [ ] **Hook:** `useCrystalForToday` → RPC; `startCheckout` → `refreshProfile()` pós-compra.
- [ ] **Middleware:** checagem server-side com `canAccessApp`.
- [ ] **Teste E2E:** compra sandbox → webhook grava `active` → app libera; cristal libera 1 dia; expiração → volta ao paywall.

---

## 7. Segurança e cuidados
- **Service role key** só no servidor (webhook). **Nunca** no cliente/bundle.
- **Autentique o webhook** (Authorization header) e valide o payload.
- **Fonte de verdade = `profiles`** atualizado pelo webhook; o cliente é otimista.
- **RLS:** usuários não podem alterar `subscription_*` diretamente — só o webhook
  (service role) escreve esses campos. Garanta que a policy de UPDATE do próprio
  usuário **não** inclua essas colunas (ou use uma coluna/So RPC dedicada).
- **Idempotência:** `consume_daily_crystal` já é idempotente por dia; webhooks
  podem chegar duplicados — o `update` por status é naturalmente idempotente.
- **Fuso do "dia":** alinhe a RPC de cristal com a data local do cliente.

---

## 8. Referências dos arquivos já prontos (não recriar)
- Regras: [src/lib/access/accessRules.ts](../src/lib/access/accessRules.ts)
- Plano/benefícios: [src/data/subscription.ts](../src/data/subscription.ts)
- Placeholders SDK: [src/lib/payments/revenuecat.ts](../src/lib/payments/revenuecat.ts)
- Hook de acesso: [src/hooks/useAccessGate.ts](../src/hooks/useAccessGate.ts)
- Guards/rota: [src/components/AccessGuard.tsx](../src/components/AccessGuard.tsx) ·
  [src/app/paywall/page.tsx](../src/app/paywall/page.tsx)
- Tipos: [src/types/database.ts](../src/types/database.ts) (colunas já previstas)
