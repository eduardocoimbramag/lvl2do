# Pagamento (RevenueCat) — o que foi feito e o que falta

> Resumo breve do progresso da integração descrita em
> [paymentsystem.md](paymentsystem.md). O **código** está pronto e o build passa;
> falta a **configuração externa** (RevenueCat + envs) para ativar de verdade.

---

## ✅ Feito (código)

- **SQL (por você):** colunas `plan / subscription_status / subscription_expires_at /
  last_crystal_access_date` + RPC `consume_daily_crystal`.
- **SDK** — [`src/lib/payments/revenuecat.ts`](../src/lib/payments/revenuecat.ts):
  implementação real com `@revenuecat/purchases-js` (instalado), **carregado sob
  demanda** (não pesa no bundle). `ensureConfigured`, `startRevenueCatCheckout`
  (getOfferings → purchase → checa `entitlements.active["pro"]`),
  `refreshRevenueCatEntitlement`. **Defensivo:** sem a key, tudo vira no-op
  ("not-implemented") sem quebrar.
- **Webhook** — [`src/app/api/webhooks/revenuecat/route.ts`](../src/app/api/webhooks/revenuecat/route.ts):
  autentica pelo header, mapeia eventos (INITIAL_PURCHASE/RENEWAL/EXPIRATION/
  BILLING_ISSUE…) e grava `subscription_*` no `profiles` via **service role**.
  (CANCELLATION não rebaixa acesso — só EXPIRATION encerra.)
- **Hook** — [`src/hooks/useAccessGate.ts`](../src/hooks/useAccessGate.ts):
  `useCrystalForToday` chama a RPC `consume_daily_crystal` + `refreshProfile`
  (com fallback de dev); `startCheckout` faz `refreshProfile` após compra;
  `ensureConfigured(user.id)` no login. Simulação de dev mantida (ignorada em prod).
- **Guard server-side** — [`src/lib/supabase/middleware.ts`](../src/lib/supabase/middleware.ts):
  checagem com `canAccessApp` nas rotas do app, **desligada por padrão** (só liga
  com `ENABLE_SERVER_ACCESS_GUARD="true"`).
- **Envs de exemplo** — [`.env.example`](../.env.example): documentadas.
- **Build:** `npm run build` verde; `/paywall` leve (SDK sob demanda).

---

## ⏳ Falta (configuração — não é código)

1. **RevenueCat Dashboard**
   - Criar **Entitlement** com id exatamente `pro`.
   - Criar **Product** (assinatura mensal R$ 14,90, trial 14 dias) e uma **Offering**
     "current" com um Package apontando para ele.
   - Pegar a **Web Billing public API key**.
   - **Webhook:** apontar para `https://SEU_DOMINIO/api/webhooks/revenuecat` com
     header `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`.

2. **Variáveis de ambiente** (no `.env.local` / no host de produção)
   - `NEXT_PUBLIC_REVENUECAT_WEB_API_KEY` (public)
   - `REVENUECAT_WEBHOOK_SECRET` (server-only)
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only — nunca no cliente)
   - `ENABLE_SERVER_ACCESS_GUARD=true` **só quando** a assinatura real estiver ativa.

3. **Casar usuário ↔ RevenueCat**
   - Confirmar que o `appUserId` do SDK (= `auth.uid()` do Supabase) chega no
     webhook como `app_user_id`, para o `.eq("id", app_user_id)` acertar o profile.
     (Alternativa: gravar/consultar `rc_app_user_id` no profile.)

4. **RLS das colunas de assinatura**
   - Garantir que a policy de UPDATE do próprio usuário **não** permita alterar
     `subscription_status / subscription_expires_at / plan` — só o webhook
     (service role) escreve. Senão, um usuário poderia se dar acesso Pro.

5. **Fuso do "dia" no cristal**
   - Ajustar `consume_daily_crystal` para o fuso local (ex.: `America/Sao_Paulo`)
     ou passar a data local do cliente como argumento, para bater com o app.

6. **Teste E2E (sandbox)**
   - Compra sandbox → webhook grava `active`/`trialing` → app libera.
   - "Usar 1 cristal" debita 1 e libera o dia (idempotente).
   - Expiração → volta ao paywall. Ligar `ENABLE_SERVER_ACCESS_GUARD` e revalidar.

---

## 🔎 Como testar AGORA (sem RevenueCat)

- O **paywall** e o **gate client-side** já funcionam. Em dev, use "Simular Pro
  ativo" / "Resetar simulação" no paywall para entrar/sair do app.
- "Usar 1 cristal hoje" já tenta a **RPC real** `consume_daily_crystal` (que você
  criou); se o usuário tiver cristais, debita e libera o dia de verdade.
- O botão "Começar 14 dias grátis" mostra o aviso de indisponível até as envs do
  RevenueCat existirem (comportamento esperado).

## ⚠️ Não esquecer ao ir para produção
- `ENABLE_SERVER_ACCESS_GUARD=true` (defesa em profundidade no servidor).
- Nunca commitar as chaves reais (só `.env.local` / secrets do host).
- Revisar as policies de RLS (item 4).
