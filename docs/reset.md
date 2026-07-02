# Master Reset — zerar a conta para testes

> **Objetivo:** um botão/ação que devolve a conta ao estado "recém-criada"
> (XP 0, nível 1, sem missões, sem histórico de métricas, streak 0, sem
> notificações/alarmes/tickets locais), para você testar o SaaS do zero
> repetidas vezes. **Restrito a você** (não deve existir para usuários comuns).

**É uma boa ideia?** Sim. É uma ferramenta de dev comum ("seed/reset"). O único
cuidado é **restringir o acesso** e **confirmar antes de apagar** (a ação é
destrutiva e irreversível).

---

## 1. Onde os dados vivem (o que precisa ser zerado)

O estado da conta está em **dois lugares**:

### A) Banco de dados (Supabase) — por `user_id`
| Tabela | O que guarda | Ação no reset |
|---|---|---|
| `missions` | missões do usuário | **apagar** todas do user |
| `xp_events` | log de XP (base do gráfico de Métricas) | **apagar** todos do user |
| `redemptions` | resgates na loja | **apagar** do user |
| `referrals` | indicações feitas/recebidas | apagar (opcional — ver nota) |
| `friendships` | amizades | apagar (opcional) |
| `profiles` | XP, nível, streak, classe, skin, crystals, etc. | **resetar campos** (não apagar a linha) |

**Campos do `profiles` a resetar** (mantendo `id`, `nickname`, `tag`, `name`,
`country`, `member_since`, `referral_code`):
`total_xp=0, level=1, daily_xp=0, daily_xp_date=null, yesterday_xp=0,
yesterday_xp_date=null, current_streak=0, best_streak=0,
last_mission_completed_at=null, year_xp=0, crystals=0`.
Opcional (se quiser voltar ao "primeiro login"): `character_class='',
character_skin=''` — força a tela de escolha de classe de novo.

### B) Navegador (localStorage) — estado local
Chaves usadas hoje (ver os hooks):
- `lvl2do.retroCompletions.v1` — conclusões por-dia (calendário)
- `lvl2do.alarms.v1` e `lvl2do.alarms.fired.v1` — alarmes + disparos
- `lvl2do.notifications.v1` — notificações (sino)
- `lvl2do.tickets.v1` — tickets de suporte

> ⚠️ **Importante:** limpar só o banco **não basta** — o `retroCompletions`
> (localStorage) segura conclusões de missões recorrentes por dia. Um reset
> completo precisa limpar **A + B**.

---

## 2. Três formas de fazer (do mais simples ao mais integrado)

### Opção 1 — SQL manual no Supabase (mais simples, zero código)
Rodar um script no SQL Editor + limpar o localStorage pelo DevTools.
- **Prós:** nada a codar; imediato; seguro (só você tem acesso ao Supabase).
- **Contras:** dois passos manuais (SQL + DevTools); precisa saber seu `user_id`.
- **Melhor para:** uso pontual agora.

### Opção 2 — Botão no app, protegido por allowlist (recomendado)
Um botão "Resetar conta (dev)" visível só para o **seu e-mail**, que chama as
APIs do Supabase (deletes + update no profile) e limpa o localStorage, depois
recarrega. Como as tabelas têm **RLS por `user_id`**, o próprio cliente já só
consegue apagar os **seus** dados — não precisa de service key.
- **Prós:** 1 clique; limpa banco + localStorage juntos; reproduzível.
- **Contras:** ~1 arquivo de hook + 1 botão; precisa do gate de allowlist.
- **Melhor para:** testar toda hora durante o desenvolvimento.

### Opção 3 — Rota/endpoint admin com service role (mais poderoso)
Uma API route server-side usando a **service key** para resetar qualquer conta.
- **Prós:** pode resetar outras contas; ignora RLS.
- **Contras:** exige guardar a `SUPABASE_SERVICE_ROLE_KEY` no servidor e proteger
  MUITO bem o endpoint. **Overkill e arriscado** para "só eu testar".
- **Melhor para:** ferramenta de admin de verdade (não é o caso agora).

**Recomendação:** comece pela **Opção 1** (agora), e implemente a **Opção 2**
quando quiser o botão no app. Evite a Opção 3.

---

## 3. Opção 1 — SQL manual (passo a passo)

### 3.1. Descubra seu `user_id`
No **SQL Editor**:
```sql
select id, email from auth.users where email = 'SEU_EMAIL_AQUI';
```

### 3.2. Rode o reset (troque `:uid` pelo id acima)
```sql
-- apaga dados dependentes
delete from public.missions   where user_id = ':uid';
delete from public.xp_events  where user_id = ':uid';
delete from public.redemptions where user_id = ':uid';
-- (opcional) amizades/indicações:
-- delete from public.friendships where requester_id = ':uid' or addressee_id = ':uid';
-- delete from public.referrals   where referrer_id = ':uid' or referred_id  = ':uid';

-- reseta o profile (NÃO apaga a linha)
update public.profiles set
  total_xp = 0,
  level = 1,
  daily_xp = 0,
  daily_xp_date = null,
  yesterday_xp = 0,
  yesterday_xp_date = null,
  current_streak = 0,
  best_streak = 0,
  last_mission_completed_at = null,
  year_xp = 0,
  crystals = 0
  -- , character_class = '', character_skin = ''  -- descomente p/ voltar ao onboarding
where id = ':uid';
```

### 3.3. Limpe o localStorage (DevTools → Console)
```js
["lvl2do.retroCompletions.v1","lvl2do.alarms.v1","lvl2do.alarms.fired.v1",
 "lvl2do.notifications.v1","lvl2do.tickets.v1"].forEach(k => localStorage.removeItem(k));
location.reload();
```

Pronto — a conta volta ao estado inicial.

---

## 4. Opção 2 — Botão no app (IMPLEMENTADO)

Implementado no menu do avatar da sidebar → **Configurações → Área de ADM**
(visível só para os e-mails em `src/lib/devAccess.ts`). Arquivos:
`src/lib/devAccess.ts`, `src/lib/db/resetAccount.ts`,
`src/components/AccountMenu.tsx`, `src/components/SettingsModal.tsx`.

> ⚠️ **Pré-requisito (rodar UMA vez):** o botão apaga dados via cliente, e o RLS
> só permite DELETE onde há policy. Hoje só `missions` tem. Rode
> **`supabase/reset-delete-policies.sql`** no SQL Editor para habilitar o
> DELETE-próprio em `xp_events`, `redemptions`, `friendships`, `referrals`.
> Sem isso, o reset ainda zera o profile e apaga `missions`, mas o histórico de
> métricas (`xp_events`) não some (o código tolera a falha, só avisa no console).

Esboço de referência das três peças:

### 4.1. Gate "sou eu?" (allowlist por e-mail)
```ts
// src/lib/devAccess.ts
const DEV_EMAILS = ["eduardocoimbramag@gmail.com"]; // só você
export function isDevUser(email?: string | null) {
  return !!email && DEV_EMAILS.includes(email.toLowerCase());
}
```
Alternativa mais robusta: usar `NEXT_PUBLIC_ENABLE_DEV_TOOLS=true` no
`.env.local` (só na sua máquina) e checar `process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS`.

### 4.2. Função de reset (client) — reusa o que já existe
```ts
// src/lib/db/resetAccount.ts
import { createClient } from "@/lib/supabase/client";

const LOCAL_KEYS = [
  "lvl2do.retroCompletions.v1",
  "lvl2do.alarms.v1",
  "lvl2do.alarms.fired.v1",
  "lvl2do.notifications.v1",
  "lvl2do.tickets.v1",
];

export async function resetMyAccount() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado.");
  const uid = user.id;

  // RLS já restringe ao próprio user — deletes seguros
  await supabase.from("missions").delete().eq("user_id", uid);
  await supabase.from("xp_events").delete().eq("user_id", uid);
  await supabase.from("redemptions").delete().eq("user_id", uid);

  await supabase.from("profiles").update({
    total_xp: 0, level: 1,
    daily_xp: 0, daily_xp_date: null,
    yesterday_xp: 0, yesterday_xp_date: null,
    current_streak: 0, best_streak: 0,
    last_mission_completed_at: null,
    year_xp: 0, crystals: 0,
  }).eq("id", uid);

  // limpa estado local
  LOCAL_KEYS.forEach((k) => localStorage.removeItem(k));
}
```

### 4.3. Botão (ex.: no fim do Perfil), só para dev
```tsx
// dentro de ProfilePage, com useAuth()
const { user } = useAuth();
if (!isDevUser(user?.email)) return null; // some para não-dev

// ...botão com dupla confirmação:
<Button
  variant="secondary"
  onClick={async () => {
    if (!confirm("APAGAR todos os seus dados de teste? Isto é irreversível.")) return;
    await resetMyAccount();
    window.location.href = "/dashboard"; // recarrega do zero
  }}
>
  Resetar conta (dev)
</Button>
```

**Reusa** o `useAuth()` (email + user), o `createClient()` do Supabase e o
padrão de `updateMyProfile`. Recomendo **dupla confirmação** e um texto claro.

---

## 5. Segurança (para ser só você)

- **RLS é sua proteção principal:** todas as tabelas filtram por `user_id`, então
  mesmo que o botão vazasse, um usuário só apagaria os **próprios** dados.
- **Esconda o botão** com a allowlist de e-mail **ou** com uma env var de dev
  (`NEXT_PUBLIC_ENABLE_DEV_TOOLS`) que você só liga na sua máquina.
- **Nunca** exponha a `service_role` key no cliente. A Opção 3 (service role)
  só se justificaria numa ferramenta de admin server-side, com o endpoint bem
  protegido — não é necessário aqui.
- **Confirmação dupla** antes de apagar (a ação é irreversível).
- Se um dia for para produção, remova/desligue o botão (env var em `false`).

---

## 6. Checklist do reset completo
- [ ] `missions` do user apagadas
- [ ] `xp_events` do user apagados (zera o gráfico de Métricas)
- [ ] `redemptions` (e opcional: `friendships`, `referrals`)
- [ ] `profiles`: XP/level/streak/daily/yesterday/year_xp/crystals zerados
- [ ] localStorage: `retroCompletions`, `alarms`, `alarms.fired`,
      `notifications`, `tickets` removidos
- [ ] recarregar a página
