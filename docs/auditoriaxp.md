# Auditoria — "meu XP total fica zerando"

Data: 2026-09-01 · Escopo: `src/hooks/useUserStats.ts`, `src/hooks/AppStateProvider.tsx`, `src/components/AuthProvider.tsx`, `src/lib/xp-system.ts`, `src/lib/db/profiles.ts`, `supabase/*.sql`
Status: **diagnóstico. Nada foi implementado neste repositório.**

---

## 1. Veredito

O app zera o próprio XP no banco **a cada carregamento completo de página**. O `AppStateProvider` monta antes de o profile carregar (`src/app/(app)/layout.tsx:25` + `src/app/layout.tsx:39`, sem gate de `loading`), então as sementes valem `0`/`null` (`src/hooks/AppStateProvider.tsx:91-98`). O efeito que só deveria migrar orçamentos diários (`src/hooks/useUserStats.ts:128-167`) detecta `changed === true` incondicionalmente nesse estado e chama `persistStats` **com `totalXp: 0`** (`:157-167`), que vira `UPSERT profiles SET total_xp = 0, level = 1, daily_xp = 0` (`src/hooks/AppStateProvider.tsx:66-71` → `src/lib/db/profiles.ts:32-36`), autorizado por `supabase/schema.sql:54-56`.

A partir daí o dano é irreversível pelo app: a RPC de conclusão é puramente incremental sobre o valor lido do banco (`supabase/2026-mission-completions.sql:133` e `:257`), então cada missão nova reconstrói o total a partir de zero.

Confiança: **ALTA**. O mecanismo é determinístico, não é corrida de sorte, e foi verificado linha a linha. O servidor está inocentado.

---

## 2. O sintoma, e o que ele já descarta

O print mostra, ao mesmo tempo:

| Indicador | Valor | Origem no código | Sobreviveu? |
|---|---|---|---|
| Nível 1 · XP 0/800 | zerado | `profiles.total_xp` → `src/lib/xp-system.ts:97-102,134-147` | ❌ |
| XP diário 0/300 | zerado | `profiles.daily_xp` | ❌ |
| Missões concluídas 5/6 | íntegro | `mission_completions` → `src/hooks/useMissions.ts:285-291`, `src/app/(app)/dashboard/page.tsx:45,99` | ✅ |
| Conclusão do dia 75/100/100/83% | íntegro | mesmas fontes (`dashboard/page.tsx:48-60`) | ✅ |
| Streak 2 dias | íntegro | `profiles.current_streak` | ✅ |
| Classe Bruxa | íntegro | `profiles.character_class` | ✅ |

`calculateCurrentLevelProgress(0)` devolve exatamente "Nível 1 · 0/800" (`src/lib/xp-system.ts:97-102`, `:134-147`). O print é a saída literal de `total_xp = 0`, não um erro de renderização.

**O que essa combinação já descarta, sem precisar do banco:**

- **Não foi reset de conta.** `src/lib/db/resetAccount.ts:53-66` apaga `mission_completions`, `missions` e `xp_events`, e `:69-86` zera `current_streak`, `best_streak`, `year_xp` e `crystals`. Com streak 2, 6 missões vivas e 5 conclusões do dia, o reset não rodou. (O e-mail do usuário está em `src/lib/devAccess.ts:11`, então o botão existe — mas os dados provam que não foi usado.)
- **Não foi perda por inatividade.** `src/lib/xp-system.ts:23` (`INACTIVITY_LOSS_ENABLED = false`) e `src/hooks/useUserStats.ts:246-251` retornam **antes** de `applyInactiveDayLoss`. Além disso `inactivityEnabled = lossCheckSupported` é `false` quando `profile === null` (`src/hooks/AppStateProvider.tsx:49,99` → `useUserStats.ts:218`). Duplamente bloqueado. E −200/dia jamais produziria exatamente 0.
- **Não foi perda de sessão / RLS bloqueando leitura.** Um bloqueio de leitura mostraria a tela vazia, não missões e streak corretos. E a escrita que zera *exige* sessão válida (`src/lib/db/profiles.ts:23-28`).
- **Não foi bug da RPC.** `complete_mission_atomic` só sabe somar: `v_credited := greatest(0, least(v_mission.xp, 300 - v_used))` (`supabase/2026-mission-completions.sql:164`) e `v_total := greatest(0, coalesce(v_profile.total_xp,0) + v_credited)` (`:257`). É incapaz de reduzir o total.
- **Não foi revert de missão.** `revert_mission_atomic` subtrai exatamente o `credited_xp` da conclusão desfeita (`:352`) e deixa um `xp_events` negativo rastreável (`:370-378`).

Sobrou uma pergunta: **o que zerou `total_xp` e `daily_xp` sem tocar em `current_streak`, `character_class`, `missions` nem `mission_completions`?** A resposta é a partição exata do payload de `persistStats`.

---

## 3. Causa raiz — CONFIRMADA (confiança ALTA)

### 3.1 Mecanismo, passo a passo

**Passo 1 — o provider monta sem profile, sempre.**
`src/app/layout.tsx:39` renderiza `<AuthProvider>{children}</AuthProvider>` **sem esperar `loading`**. `src/app/(app)/layout.tsx:25` põe `<AppStateProvider>` como elemento mais externo, **acima** de `ClassGuard` e `AccessGuard` — os guards seguram os *filhos*, não o provider. `src/components/AuthProvider.tsx:37` inicia `profile` como `null`, e só o preenche dentro de um `setTimeout(…, 0)` (`:60-66`) depois de um `await` de rede (`:47`).
→ Em qualquer load completo de rota interna, é **impossível** que `profile` esteja preenchido no primeiro flush de efeitos. Não existe caminho alternativo.

**Passo 2 — as sementes degradam para zero.**
`src/hooks/AppStateProvider.tsx:91-98`: `seedTotalXp: profile?.total_xp ?? 0`, `seedDailyXpDate: … ?? null`, `seedYesterdayXpDate: … ?? null`.

**Passo 3 — o efeito de re-semeadura roda com `dirty === false`.**
`src/hooks/useUserStats.ts:128` não tem guarda de primeiro render; `:129` só retorna se `dirty.current` — e `dirty` (`:122`) só vira `true` em `adoptServerProfile:391` (pós-RPC), no ramo inalcançável de inatividade (`:254`) e em mutadores locais que são **código morto** (nenhum chamador fora do arquivo; as conclusões passam por `completeMissionAtomic`, `src/hooks/useMissions.ts:196`).

**Passo 4 — `changed` é verdadeiro incondicionalmente, por duas vias independentes.**
`normalizeDailyBudgets` (`src/lib/xp-system.ts:314-333`) devolve **sempre** `yesterdayXpDate = previousDateKey(hoje)` (`:319`, nunca `null`) e **sempre** `dailyXpDate = todayKey` (`:327-330`). O teste de `useUserStats.ts:152-156` compara isso com as sementes:

```
next.dailyXpDate (hoje)      !== seedDailyXpDate (null)      → true   (:154)
next.yesterdayXpDate (ontem) !== seedYesterdayXpDate (null)  → true   (:156)
```

Duas pernas, ambas verdadeiras. **Consequência prática: uma correção que só torne `yesterdayXpDate` anulável NÃO resolve o bug.**

**Passo 5 — o payload é destrutivo, inclusive no fallback.**
`useUserStats.ts:157-167` envia `totalXp: next.totalXp` (= `seedTotalXp` = **0**) e `level: calculateLevelFromXp(0)` (= **1**), apesar de o comentário em `:149-151` declarar que o propósito do bloco é apenas persistir a migração de orçamento. `src/hooks/AppStateProvider.tsx:66-71` monta `core = { total_xp: 0, level: 1, daily_xp: 0, daily_xp_date: hoje }` e `:72-78` envia `core` + `yesterday_*`. Se esse upsert falhar, o `catch` de `:79-84` **refaz com `core`** — que ainda contém `total_xp: 0`. O comentário em `:55` diz literalmente *"total_xp/daily_xp SEMPRE persistem"*. **Não existe caminho de erro que salve o total.**

**Passo 6 — o banco aceita.**
`src/lib/db/profiles.ts:32-36` faz `.upsert({ id: user.id, ...patch })`; com `Prefer: resolution=merge-duplicates` o PostgREST emite `INSERT … ON CONFLICT (id) DO UPDATE SET` apenas com as chaves do JSON. A linha já existe (criada por `supabase/schema.sql:59-71`), então o caminho executado é o UPDATE e as colunas fora do payload **não são tocadas**. `supabase/schema.sql:54-56` e `supabase/fix-profiles.sql:55-56` autorizam (`for update using (auth.uid() = id)`), e `schema.sql:50-52` cobre o lado INSERT do upsert.

**Passo 7 — não há escrita corretiva.**
Quando o SELECT do profile finalmente volta e o efeito re-roda com as sementes reais, `changed` é avaliado **contra o banco já zerado**: `daily_xp_date` já é hoje e `yesterday_xp_date` já é ontem → `changed === false` → **nenhuma escrita de reparo é emitida**. O zero é a última gravação, deterministicamente, a cada carga.

**Passo 8 — o servidor cimenta o zero.**
`supabase/2026-mission-completions.sql:133` trava a linha (`select * … for update`) e `:257` faz `v_total := greatest(0, coalesce(v_profile.total_xp,0) + v_credited)`. O total nunca é recalculado a partir do ledger — só incrementado sobre o que estiver no profile. Zerou, reconstrói do zero.

### 3.2 Linha do tempo

```
t0  carregamento completo de /dashboard  (F5, cold start, relaunch do PWA, SW recarregando)
 │
 ├─ src/app/layout.tsx:39         <AuthProvider> renderiza filhos SEM gate de `loading`
 └─ src/app/(app)/layout.tsx:25   <AppStateProvider> monta ACIMA de ClassGuard/AccessGuard
 │
t1  primeiro commit do React  ──  profile === null   (AuthProvider.tsx:37)
 │   AppStateProvider.tsx:91-98   seedTotalXp=0 · seedDailyXpDate=null · seedYesterdayXpDate=null
 │
t2  efeito de re-semeadura dispara  (useUserStats.ts:128) — dirty === false (:122)
 │   normalizeDailyBudgets (xp-system.ts:314-333)
 │     :319   yesterdayXpDate := previousDateKey(hoje)   ← NUNCA null
 │     :327   dailyXpDate     := hoje                    ← SEMPRE hoje
 │
t3  changed === TRUE por DUAS vias   (useUserStats.ts:152-156)
 │     hoje  !== null   (:154)      ontem !== null   (:156)
 │
t4  persistStats({ totalXp: 0, level: 1, dailyXp: 0, … })   (useUserStats.ts:157-167)
 │   AppStateProvider.tsx:66-71  core = { total_xp: 0, level: 1, daily_xp: 0, daily_xp_date: hoje }
 │   AppStateProvider.tsx:79-84  se o upsert estendido falhar → refaz com `core` (ainda total_xp: 0)
 │
t5  profiles.ts:23-28  getUser()  →  :32-36  upsert          [2 RTTs]
 │   UPDATE profiles SET total_xp=0, level=1, daily_xp=0, daily_xp_date=hoje,
 │                       yesterday_xp=0, yesterday_xp_date=ontem   WHERE id = uid
 │   ↑ current_streak, best_streak, character_class, year_xp, missions, mission_completions
 │     NÃO estão no payload  →  SOBREVIVEM INTACTOS
 │
t6  SELECT do profile volta  (AuthProvider.tsx:47)  →  setProfile(...)   [1 RTT]
 │   efeito re-roda com as sementes REAIS (dirty ainda false)
 │   ├─ banco já auto-consistente (daily_xp_date=hoje, yesterday_xp_date=ontem)
 │   │     → changed === FALSE  →  NENHUMA escrita corretiva  →  o 0 permanece   ◀ caso dominante
 │   └─ banco ainda com daily_xp_date antigo (1º load do dia)
 │         → changed === TRUE → persist #2 com o total real → PODE reparar,
 │           se chegar depois do persist #1 (duas cadeias independentes, ordem não garantida)
 │
t7  próxima conclusão de missão
     2026-mission-completions.sql:133   SELECT … FOR UPDATE   (lê 0 do banco)
                                 :257   v_total := greatest(0, 0 + v_credited)
     → o total é reconstruído a partir do zero, e o ciclo recomeça no próximo load
```

Observação: em **desenvolvimento** o efeito roda duas vezes (`next.config.mjs:3`, `reactStrictMode: true`) — duas gravações zeradas. Em produção, uma. Não muda o diagnóstico.

### 3.3 O que NÃO é load-bearing nesta prova

Duas justificativas que circularam nas análises intermediárias são acessórias e não sustentam nada sozinhas:

- **"efeitos filhos rodam antes do pai"** — é verdade (flush bottom-up), mas irrelevante: mesmo que o efeito do `AuthProvider` rodasse primeiro, `setProfile` só acontece após `setTimeout(0)` **mais** um `await` de rede (`AuthProvider.tsx:60-66`, `:47`). A prova é a assincronia, não a ordem.
- **"a corrida GET × UPSERT"** (2 RTTs de escrita contra 1 de leitura) — decide apenas *quando o usuário percebe*, não *se o dano ocorre*. O dano vem de `changed === false` no t6, não da corrida.

---

## 4. Por que o streak sobreviveu e o XP não

É a prova mais legível do diagnóstico, e ela está no código como um par quase idêntico de hooks irmãos:

| | `useUserStats` | `useStreak` |
|---|---|---|
| efeito de re-semeadura | `src/hooks/useUserStats.ts:128-167` | `src/hooks/useStreak.ts:52-59` |
| guarda `dirty` | `:129` | `:53` |
| atualiza estado local | sim | sim |
| **grava no banco durante o re-seed** | **SIM — `persistRef.current?.()` em `:158`** | **NÃO — nenhuma chamada de persistência** |
| quando persiste | no re-seed e no commit | só em `registerCompletion` (`:77`), hoje código morto |
| colunas do payload | `total_xp, level, daily_xp, daily_xp_date, yesterday_xp, yesterday_xp_date[, last_xp_loss_check_date]` (`AppStateProvider.tsx:66-78`) | `current_streak, best_streak, last_mission_completed_at` (`AppStateProvider.tsx:104-113`) |

Mesmo provider, mesmo padrão `dirty`, mesma janela com `profile === null`. **Um deles escreve no banco durante a re-semeadura; o outro não.** E os conjuntos de colunas são **disjuntos**, então o UPSERT parcial do XP passa ao lado do streak sem tocá-lo.

O corte do print é exatamente esse:

```
DENTRO do payload de persistStats  →  ZEROU
   total_xp · level · daily_xp · daily_xp_date · yesterday_xp · yesterday_xp_date

FORA do payload                    →  SOBREVIVEU
   current_streak · best_streak · last_mission_completed_at · character_class
   year_xp · missions · mission_completions
```

Se a causa fosse "perda de dados", "reset de conta" ou "sessão trocada", o corte não seria esse — seria a linha inteira ou a conta inteira. O corte segue a **assinatura de um payload específico**, e esse payload tem um dono conhecido.

---

## 5. Causas secundárias e agravantes

Ordenadas por probabilidade de terem contribuído para o sintoma relatado.

### #1 — CONFIRMADA · Re-semeadura persistindo `total_xp` com profile nulo
Descrita na §3. Explica **100% do print sozinha**, sem premissas adicionais. Dispara em todo load completo de rota interna.
**Qualificador importante:** não dispara em navegação client-side (ir de `/login` para `/dashboard` com o `AuthProvider` já montado e o profile carregado semeia valores reais). O gatilho é F5, cold start, relaunch do PWA e recarga por service worker.

### #2 — HIPÓTESE NÃO CONFIRMADA (mecanismo real, atribuição fraca) · `profile` volta a `null` após leitura falha
`src/components/AuthProvider.tsx:47-48` desestrutura **apenas** `{ data }` e nunca inspeciona `error`. O `postgrest-js` converte falha de rede/401 em `{ data: null, error }` sem lançar → `setProfile(null)` **destrói um profile já carregado**. E o handler roda a cada foco de aba (`:81-92`). As sementes voltam a `0`/`null` e o ciclo da §3 se repete.
**Por que não é a explicação necessária:** exige `dirty.current === false`, ou seja, uma sessão em que **nenhuma missão foi concluída** — porque `adoptServerProfile` marca `dirty = true` a cada conclusão via RPC (`useUserStats.ts:391`). Exatamente na sessão em que o usuário está fazendo missões, este caminho está desarmado. E não há nenhuma evidência de erro transitório no relato.
**Veredito:** bug real, corrigir junto. **Não** conte como segundo gatilho comprovado.

### #3 — HIPÓTESE NÃO CONFIRMADA · Virada de meia-noite com o app aberto
`src/hooks/useUserStats.ts:198-208` re-normaliza os orçamentos quando o `todayKey` muda e chama `commit(next)` (`:207` → `:178-190`), que persiste `totalXp` **sem consultar `dirty`** — por design documentado em `:192-197`. No mount é no-op (o efeito de `:128` já normalizou e `normalizeDailyBudgets` é idempotente). É uma segunda via de sobrescrita cega, mas rara, e no cenário do usuário é *redundante* com a causa #1 (que já gravou 0 antes).

### #4 — MENOR · Divergência de fuso entre cliente e servidor
O cliente usa a data local do device (`src/lib/xp-system.ts:60-65`), a RPC usa `America/Sao_Paulo` (`supabase/2026-mission-completions.sql:110`). Na prática o cliente **sempre** envia `p_completed_for_date` (`src/lib/db/missionCompletions.ts:51`), então o fuso do servidor é só fallback. Pode gerar `changed` espúrio perto da meia-noite; irrelevante para o sintoma.

### #5 — AGRAVANTE · `v_used` reforçado por contadores escritos pelo cliente
`supabase/2026-mission-completions.sql:152-161` calcula o orçamento usado como `greatest(soma das conclusões ativas, profile.daily_xp)`. Como o cliente pode inflar `daily_xp`, isso **suprime ganhos futuros** (nunca reduz o total). Não é a causa, mas é auto-sabotagem esperando acontecer.

### Como distinguir #1 de #2 na prática

1. Faça login, abra o dashboard e **não conclua nada**. Rode a Q1 da §6. Se `total_xp` foi a 0 e `updated_at` marca o instante do load → **#1 confirmada** no seu banco.
2. Restaure o XP (§8), conclua **uma** missão (isso seta `dirty = true`), troque de aba e volte várias vezes. Se o XP sobreviver, **#2 está desarmada nessa sessão**, como previsto.
3. No banco, as duas causas produzem o **mesmo** UPDATE (`current_user = authenticated`). Só a instrumentação do cliente separa uma da outra; o `updated_at` correlacionado ao evento (load vs. foco) é o discriminador barato.

---

## 6. Como confirmar no seu banco

Rode no SQL Editor do Supabase (papel `postgres`, sem RLS). Troque `'<UUID>'` pelo seu `auth.users.id`.

### Q0 — qual schema de `xp_events` está vivo (rode primeiro)

```sql
select column_name, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'xp_events'
 order by ordinal_position;
```

**O que significa:** existem duas versões conflitantes no repo — `supabase/2026-progress-streak.sql:24-32` (`kind`, `category`, `created_at`) e a que a RPC realmente usa (`reason`, `daily_cap_applied`, `happened_on`, `happened_at`, documentada em `supabase/2026-xp-audit.sql:8-13`).
- Se vierem `reason/happened_on/happened_at` → é a versão da RPC; Q3/Q4 valem. Consequência colateral: `getXpEvents` (`src/lib/db/xpEvents.ts:34-39`) ordena por `created_at`, coluna que não existe → **a página de Métricas está quebrada**.
- Se vierem `kind/category/created_at` → o INSERT da RPC (`2026-mission-completions.sql:287-293`) abortaria a transação e **nenhuma conclusão teria sido gravada** — o que contradiz o print. Nesse caso, pare e reavalie tudo.

### Q1 — estado atual do profile

```sql
select id, nickname, total_xp, level, daily_xp, daily_xp_date,
       yesterday_xp, yesterday_xp_date, current_streak, best_streak,
       year_xp, year_xp_year, last_mission_completed_at, updated_at
  from public.profiles
 where id = '<UUID>';
```

**O que significa:** `total_xp = 0` **com** `current_streak >= 2` **e** `updated_at` no instante do último carregamento de página (sem nenhuma conclusão nesse momento) é a assinatura da causa #1. Se `updated_at` estiver alinhado com a última conclusão, a última escrita foi da RPC — outro cenário.

### Q2 — a verdade, a partir das conclusões (fonte primária)

```sql
select completed_for_date,
       count(*)               as conclusoes,
       sum(credited_xp)       as xp_do_dia
  from public.mission_completions
 where user_id = '<UUID>' and reverted_at is null
 group by 1
 order by 1;

select coalesce(sum(credited_xp), 0) as xp_total_devido
  from public.mission_completions
 where user_id = '<UUID>' and reverted_at is null;
```

**O que significa:** `xp_total_devido > profiles.total_xp` é a **prova direta** de que o XP foi apagado fora da RPC — nenhum caminho SQL reduz `total_xp` sem deixar um `xp_events` negativo (Q4). Se `xp_total_devido = 0`, nada foi creditado e o problema é outro (limite diário, RPC falhando).

### Q3 — a verdade, a partir do ledger (fonte secundária)

```sql
select count(*)                              as eventos,
       sum(amount)                           as soma_liquida,
       sum(amount) filter (where amount > 0) as ganhos,
       sum(amount) filter (where amount < 0) as reversoes,
       min(happened_on), max(happened_on)
  from public.xp_events
 where user_id = '<UUID>';
```

**O que significa:** `soma_liquida` é o total que o servidor acredita ter creditado ao longo da vida da conta. `reversoes` diferente de 0 indica desfazimentos legítimos (`2026-mission-completions.sql:370-378`). Se `soma_liquida > total_xp` e `reversoes = 0`, não existe explicação legítima para a diferença.

### Q4 — a divergência formal (equivalente à consulta 3 de `supabase/2026-xp-audit.sql:45-55`)

```sql
select p.id, p.nickname, p.total_xp,
       coalesce(e.soma, 0) as soma_eventos,
       p.total_xp - coalesce(e.soma, 0) as diferenca
  from public.profiles p
  left join (select user_id, sum(amount) as soma
               from public.xp_events group by user_id) e on e.user_id = p.id
 where p.total_xp <> coalesce(e.soma, 0)
 order by abs(p.total_xp - coalesce(e.soma, 0)) desc;
```

**O que significa:** `diferenca` fortemente negativa = XP sumiu do profile sem evento correspondente. É o dano quantificado.

### Q5 — `year_xp` como testemunha independente

```sql
select total_xp, year_xp, year_xp_year, level
  from public.profiles where id = '<UUID>';
```

**O que significa:** `year_xp` é mantido exclusivamente pelo trigger `apply_xp_event` (`supabase/2026-social.sql:47-61`), que **só soma**, e **não** está no payload de `persistStats`. Portanto `year_xp > total_xp` só é possível se algo rebaixou `total_xp` por fora do ledger. É a prova mais limpa, e você consegue vê-la sem SQL: as duas abas do ranking (`src/app/(app)/ranking/page.tsx`, uma por `total_xp` e outra por `year_xp`) vão discordar.

### Q6 — quem tem permissão de escrever `total_xp`

```sql
select polname, polcmd,
       pg_get_expr(polqual, polrelid)      as using_expr,
       pg_get_expr(polwithcheck, polrelid) as with_check_expr
  from pg_policy where polrelid = 'public.profiles'::regclass;

select grantee, privilege_type
  from information_schema.role_table_grants
 where table_schema = 'public' and table_name = 'profiles';

select grantee, column_name, privilege_type
  from information_schema.column_privileges
 where table_schema = 'public' and table_name = 'profiles'
   and grantee in ('authenticated', 'anon');
```

**O que significa:** se `authenticated` tem `UPDATE` em **nível de tabela**, o cliente pode gravar qualquer coluna, `total_xp` inclusive — é a pré-condição do bug e o ponto de blindagem definitiva.
**Nota técnica importante:** a policy `for update using (auth.uid() = id)` **sem** `WITH CHECK` não é o problema — no Postgres, `WITH CHECK` omitido reutiliza a expressão do `USING`, e a checagem é de **linha**, nunca de coluna. Adicionar `with check` não mudaria nada. O controle de coluna vem de `GRANT`, e esse `GRANT` não está em nenhum arquivo do repositório: vem dos privilégios padrão do Supabase no schema `public`. Só esta query mostra o que existe de fato.

### Q7 — flagrante (opcional; **escreve no banco**: cria tabela + trigger)

```sql
create table if not exists public.xp_write_audit (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  user_id    uuid,
  old_total  integer, new_total integer,
  db_user    text, app_name text, req_method text, req_path text
);

create or replace function public.audit_total_xp_drop()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.total_xp is distinct from old.total_xp and new.total_xp < old.total_xp then
    insert into public.xp_write_audit(user_id, old_total, new_total, db_user, app_name, req_method, req_path)
    values (new.id, old.total_xp, new.total_xp, current_user,
            current_setting('application_name', true),
            current_setting('request.method', true),
            current_setting('request.path', true));
  end if;
  return new;
end; $$;

drop trigger if exists profiles_audit_total_xp on public.profiles;
create trigger profiles_audit_total_xp
  before update on public.profiles
  for each row execute function public.audit_total_xp_drop();

-- depois de reproduzir (abrir o app e dar F5):
select * from public.xp_write_audit order by at desc limit 20;

-- para remover:
-- drop trigger if exists profiles_audit_total_xp on public.profiles;
```

**O que significa:** a coluna confiável é `db_user`.
- `db_user = 'authenticated'` → UPSERT direto do cliente. **É o bug.**
- `db_user = 'postgres'` (ou o dono da função) → veio de dentro de uma RPC `security definer`, ou seja, um revert legítimo.
- `req_method` / `req_path` dependem de a versão do PostgREST expor esses GUCs; podem vir `NULL`. Trate-os como bônus, não como prova.

**Ordem sugerida:** Q0 → Q1 → Q2 → Q5 → Q4 → Q6 → (Q7 se quiser o flagrante).

---

## 7. Correção proposta — **NÃO IMPLEMENTADA**

Nenhuma linha abaixo foi aplicada ao repositório. É proposta de diagnóstico.

### Fix 1 (obrigatório) — nunca persistir em cima de sementes vazias

O efeito de re-semeadura só pode escrever no banco depois que o profile realmente carregou.

```ts
// src/hooks/AppStateProvider.tsx  (perto de :40)
const { user, profile, loading } = useAuth();
// só é seguro persistir quando as sementes vieram MESMO do banco
const seedReady = !loading && !!profile;

const userStats = useUserStats({
  seedTotalXp: profile?.total_xp ?? 0,
  // ... demais seeds inalterados
  seedReady,          // ← novo
  persistStats,
});
```

```ts
// src/hooks/useUserStats.ts  (efeito de :128)
useEffect(() => {
  if (dirty.current) return;
  const todayKey = getLocalDateKey(new Date());
  const next = normalizeDailyBudgets({ /* ...igual... */ }, todayKey);
  statsRef.current = next;
  setStats(next);

  // NUNCA persiste antes de o profile chegar — senão grava as sementes vazias
  if (!seedReady) return;                                   // ← a correção

  const changed = /* ...igual... */;
  if (changed) persistRef.current?.({ /* ... */ });
}, [/* ...deps..., */ seedReady]);
```

### Fix 2 (obrigatório) — um efeito de migração diária não escreve `total_xp`

Mesmo com o Fix 1, é errado que um bloco cujo propósito declarado (`useUserStats.ts:149-151`) é migrar orçamentos carregue o total junto. Separe o canal de persistência:

```ts
// src/hooks/AppStateProvider.tsx — novo, ao lado de persistStats (:56)
const persistDailyBudgets = useCallback((s: {
  dailyXp: number; dailyXpDate: string;
  yesterdayXp: number; yesterdayXpDate: string | null;
  lastXpLossCheckDate: string | null;
}) => {
  updateMyProfile({
    daily_xp: s.dailyXp,
    daily_xp_date: s.dailyXpDate,
    yesterday_xp: s.yesterdayXp,
    yesterday_xp_date: s.yesterdayXpDate,
    ...(lossCheckSupported ? { last_xp_loss_check_date: s.lastXpLossCheckDate } : {}),
  }).catch(() => {});   // sem fallback que reintroduza total_xp
}, [lossCheckSupported]);
```

E no efeito de re-semeadura, chamar `persistDailyBudgets` em vez de `persistStats`. Note que o `catch` de `AppStateProvider.tsx:79-84` também precisa deixar de reenviar `core` com `total_xp`.

### Fix 3 (recomendado) — `AuthProvider` não pode anular um profile carregado por erro de rede

```ts
// src/components/AuthProvider.tsx:41-51
const loadProfile = useCallback(async (uid: string | null) => {
  if (!uid) { setProfile(null); return; }
  const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).single();
  if (error) {
    console.warn("[AuthProvider] falha ao carregar profile; mantendo o anterior:", error);
    return;                       // ← não derruba o profile já carregado
  }
  setProfile(data as ProfileRow);
}, [supabase]);
```

### Fix 4 (blindagem definitiva, no banco) — tirar do cliente o poder de escrever XP

Lembrando a Q6: o remédio é **GRANT de coluna**, não `WITH CHECK`.

```sql
revoke update on public.profiles from authenticated;
grant update (name, nickname, tag, avatar_url,
              character_class, character_skin, character_background)
  on public.profiles to authenticated;
```

**Consequência que você precisa aceitar antes de aplicar:** os únicos `updateMyProfile` legítimos do app hoje são identidade e personagem (`src/hooks/useProfileIdentity.ts:32`, `useCharacterClass.ts:21`, `useCharacterSkin.ts:46`, `useCharacterBackground.ts:25`) — esses continuam funcionando. O `persistStats` e o `persistStreak` (`AppStateProvider.tsx:56-87`, `:104-113`) passariam a falhar silenciosamente (ambos já têm `.catch`), o que é **exatamente o objetivo**: streak e orçamentos já são mantidos pela RPC (`2026-mission-completions.sql:258-284`), e o orçamento do dia se auto-cura porque a RPC recalcula `v_used` a partir de `mission_completions` (`:152-161`). Só aplique depois dos Fixes 1 e 2, e teste a migração de virada de dia.

### Fix 5 (opcional, endurecimento) — tornar o total reconstruível no servidor

Fazer a RPC calcular `v_total` a partir do ledger em vez de incrementar o valor lido eliminaria a classe inteira de bugs "alguém escreveu lixo no profile". Custo: uma agregação por conclusão. Fica como decisão de arquitetura, não como correção deste incidente.

---

## 8. Recuperar o XP perdido

**Sim, é reconstruível** — a fonte de verdade (`mission_completions`) nunca foi tocada por `persistStats`, e `xp_events` serve de conferência independente.

**Ordem correta: aplique o Fix 1 antes de restaurar.** Sem ele, o próximo carregamento de página zera de novo, deterministicamente.

### 8.1 Conferir o valor devido (somente leitura)

```sql
with verdade as (
  select coalesce(sum(credited_xp), 0)::int as total
    from public.mission_completions
   where user_id = '<UUID>' and reverted_at is null
),
ledger as (
  select coalesce(sum(amount), 0)::int as total
    from public.xp_events where user_id = '<UUID>'
)
select v.total            as por_completions,
       l.total            as por_xp_events,
       p.total_xp         as no_profile_hoje,
       public.xp_level_from_total(v.total) as level_esperado
  from verdade v, ledger l, public.profiles p
 where p.id = '<UUID>';
```

As duas primeiras colunas devem bater. Se divergirem, investigue com a consulta 4 de `supabase/2026-xp-audit.sql` (conclusões ativas sem evento de ganho) antes de escrever qualquer coisa.

### 8.2 Restaurar (escreve)

```sql
-- 1) total e nível, a partir das conclusões ativas
update public.profiles p
   set total_xp = v.total,
       level    = public.xp_level_from_total(v.total)
  from (
    select coalesce(sum(credited_xp), 0)::int as total
      from public.mission_completions
     where user_id = '<UUID>' and reverted_at is null
  ) v
 where p.id = '<UUID>';

-- 2) realinhar os orçamentos de hoje/ontem com as conclusões reais
update public.profiles p set
  daily_xp = coalesce((select sum(credited_xp) from public.mission_completions
                        where user_id = p.id and reverted_at is null
                          and completed_for_date = current_date), 0),
  daily_xp_date = current_date,
  yesterday_xp = coalesce((select sum(credited_xp) from public.mission_completions
                        where user_id = p.id and reverted_at is null
                          and completed_for_date = current_date - 1), 0),
  yesterday_xp_date = current_date - 1
 where p.id = '<UUID>';
```

Se for aplicar a todos os usuários afetados, troque `where p.id = '<UUID>'` por `where p.total_xp < v.total` sobre um `join` agregado — e rode primeiro a versão `select` para ver quantas linhas mudariam.

### 8.3 Margem de erro (leia antes de rodar)

- **Subestima conclusões anteriores à migração.** Missões com `status = 'done'` que não têm linha em `mission_completions` (consulta 2 de `supabase/2026-xp-audit.sql:32-39`) não entram na soma. Se essa consulta retornar linhas para você, o valor reconstruído é um **piso**, não o número exato.
- **`credited_xp` já é pós-teto.** Ele registra o que foi efetivamente creditado após o limite de 300/dia (`2026-mission-completions.sql:164`), então somar é correto — não some `xp_snapshot` nem `original_xp`.
- **O teto do dia foi calculado corretamente mesmo com o total zerado**, porque `v_used` vem de `mission_completions` (`:154-156`), não de `total_xp`. Logo o zeramento não corrompeu os `credited_xp` já gravados. *Ressalva:* o reforço de `:157-161` usa `profile.daily_xp` com `greatest`, e o cliente zerou essa coluna — o efeito é sempre a favor do usuário (menos supressão), nunca crédito a mais.
- **`xp_events` inclui reversões negativas**, então `sum(amount)` já é líquido; não subtraia nada duas vezes.
- **`year_xp` é do ano corrente** e só serve como piso de sanidade — não use como fonte de restauração.
- **Não há como recuperar XP que nunca foi creditado.** Se alguma conclusão falhou por erro de RPC, ela não está em nenhuma das duas fontes.

---

## 9. O que ainda não sabemos

Limites honestos desta auditoria, feita **inteiramente sobre o código**, sem acesso ao banco do usuário e sem telemetria:

1. **Nenhuma query foi rodada no banco real.** Toda a §6 é hipótese verificável, não observação. A confirmação empírica depende de você.
2. **Qual versão de `xp_events` está viva** (Q0). O repositório tem duas definições conflitantes; a inferência de que a versão da RPC é a viva vem do fato de as conclusões terem funcionado — não de leitura do banco.
3. **Se `authenticated` de fato tem `UPDATE` em `profiles`** (Q6). O `GRANT` não existe em nenhum `.sql` do repo; ele viria dos padrões do Supabase. Isso é a pré-condição do bug, e só o banco vivo confirma.
4. **A cronologia exata dos dois dias do usuário** é reconstrução plausível, não registro. O mecanismo é ALTA; a narrativa de horários é MÉDIA.
5. **Quantos loads de página aconteceram, e se algum deles reparou parcialmente** (ramo `changed === true` no t6 da §3.2). Sem os logs, não dá para saber se o XP oscilou ou caiu de vez.
6. **Se o segundo gatilho (§5, causa #2) chegou a disparar** para este usuário. Nada no relato indica erro de rede; a causa #1 explica tudo sozinha.
7. **Se outros usuários estão afetados.** O bug não tem nada de específico desta conta — todo usuário que dá F5 numa rota interna passa pelo mesmo caminho. Rode Q4 sem o filtro de `user_id` para dimensionar.
8. **Impacto do `reactStrictMode`** em produção: assumimos que o efeito roda uma vez. Não foi verificado num build de produção.
9. **Comportamento sob RTT alto/offline parcial** (PWA, service worker servindo cache): não testado; pode multiplicar as gravações zeradas.

---

## 10. Riscos relacionados encontrados no caminho

Nenhum é a causa do incidente, mas todos são reais e vale abrir issue.

1. **`persistStats` pode inflar `daily_xp` e suprimir ganhos.** `2026-mission-completions.sql:157-161` usa `greatest(soma_das_conclusões, profile.daily_xp)`. Como o cliente escreve `daily_xp`, um valor inflado faria o usuário perder crédito legítimo até a virada do dia. Some-se a isso o fato de a policy permitir qualquer coluna: o vetor é de auto-sabotagem hoje, e de fraude amanhã (qualquer usuário pode setar `total_xp` no ranking).
2. **Página de Métricas provavelmente quebrada.** `src/lib/db/xpEvents.ts:34-39` ordena por `created_at`, coluna que não existe no schema que a RPC usa (`supabase/2026-xp-audit.sql:8-13`). Confirme com a Q0.
3. **`logXpEvent` é código morto** (`src/lib/db/xpEvents.ts:20-31`, zero chamadores) e escreve num schema antigo (`kind`, `category`). Se alguém voltar a usá-lo, quebra.
4. **Duas migrações conflitantes de `xp_events`** convivendo no repositório (`2026-progress-streak.sql:24-32` × `2026-xp-audit.sql:8-13`). Isso precisa ser consolidado — a ordem de aplicação decide o schema final.
5. **Mutadores locais de XP em `useUserStats` são código morto** (`:273, :295, :321, :344`, expostos via `AppStateProvider.tsx`), mas continuam capazes de escrever no banco se alguém voltar a chamá-los. Remover reduz a superfície.
6. **`registerCompletion` de `useStreak.ts:62-78` é código morto** — o streak virou responsabilidade do servidor (`2026-mission-completions.sql:281-283`). Mesma recomendação.
7. **`resetMyAccount` está atrás só de uma lista de e-mails no cliente** (`src/lib/devAccess.ts:11`, fluxo em `settings/page.tsx`). Não causou este incidente (§2), mas é um botão destrutivo protegido por verificação client-side.
8. **A varredura "todas as escritas em `profiles` estão em 5 lugares no SQL" é falsa como enunciada:** `src/app/api/webhooks/revenuecat/route.ts:90-99` grava em `profiles` com **service role** (bypassa RLS). Colunas disjuntas (`plan`, `subscription_status`, `subscription_expires_at`), então não afeta o XP — mas é um escritor privilegiado a ter no radar.
9. **O `catch` de `AppStateProvider.tsx:79-84` reenvia `core` cegamente.** Mesmo depois de corrigir o efeito de re-semeadura, esse fallback continua sendo um caminho que grava `total_xp` sem contexto. Deve morrer junto com o Fix 2.