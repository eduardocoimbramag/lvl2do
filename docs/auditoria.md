# Auditoria — Sistema de XP, Limite Diário e Streak

> Análise profunda do sistema de progressão (XP total, orçamento diário de
> 300 XP, orçamento retroativo de "ontem" e streak), com foco no comportamento
> na **virada de dia** (00:00). Cada achado traz causa (arquivo/função), prova
> ou reprodução, e a solução recomendada.

> ## ✅ STATUS: TODAS AS CORREÇÕES APLICADAS
> Os achados A1–A9 foram corrigidos e validados numericamente:
> - **A1** — `applyXpGain`/`applyXpRevert` agora normalizam (migram o orçamento)
>   antes de aplicar. ✔ validado: virada em sessão aberta preserva o XP de ontem.
> - **A2** — novo `useTodayKey()` (day tick, `src/hooks/useTodayKey.ts`): o
>   provider expõe `todayKey` como estado; memos/contadores re-derivam e os
>   orçamentos re-normalizam+persistem na virada com o app aberto.
> - **A3** — perda por inatividade LIGADA: checagem no seed e no day tick,
>   marca idempotente `last_xp_loss_check_date` + toast de perda. ⚠️ Requer
>   rodar **`supabase/2026-inactivity.sql`** (sem a coluna, a regra fica
>   desligada automaticamente — proteção contra perda duplicada).
> - **A4** — streak de EXIBIÇÃO derivado: sequência quebrada mostra 0 na hora.
> - **A5/A6** — crédito registrado com **valor e dia** em localStorage
>   (`lvl2do.creditedXp.v1`); desfazer devolve o valor exato ao orçamento do
>   dia certo (inclusive cruzando a meia-noite). Corrigido também o duplo
>   crédito de missões "uma vez" no calendário (dias passados).
> - **A7** — poda automática do mapa retro (mantém ~13 meses).
> - **A8** — falhas de `xp_events`/persist agora geram `console.warn`.
> - **A9** — o profile re-seeda ao focar a aba/janela.

---

## Sumário executivo

| # | Achado | Severidade | Área |
|---|--------|-----------|------|
| A1 | Virada de dia **com o app aberto** perde o orçamento de ontem (barra "XP do dia" de ontem zera) | **Alta** | XP diário |
| A2 | UI **congela no "dia anterior"** após a meia-noite (missões de hoje, XP diário, calendário) até recarregar/agir | **Alta** | Virada de dia |
| A3 | Perda de XP por inatividade (−200/dia) é **código morto** — nunca é aplicada | **Alta** | XP total |
| A4 | Streak exibido fica **congelado** após dias perdidos (mostra 7 mesmo com sequência quebrada) | Média | Streak |
| A5 | Desfazer **hoje** uma missão concluída **ontem** não devolve o orçamento de ontem | Média | XP diário |
| A6 | Reversão após reload pode devolver **mais XP do que foi creditado** (ganho cortado pelo teto) | Média | XP total |
| A7 | Conclusões por-dia de recorrentes vivem em localStorage: **não sincronizam entre dispositivos** e crescem sem poda | Baixa | Persistência |
| A8 | `year_xp` (ranking anual) e métricas dependem do insert em `xp_events` — falhas são **engolidas em silêncio** | Baixa | Ranking/Métricas |
| A9 | Duas abas abertas = estados independentes com *last-write-wins* no banco | Baixa | Concorrência |

---

## Como o sistema funciona hoje (mapa)

**Arquivos-chave**
- `src/lib/xp-system.ts` — funções puras: `applyXpGain/Revert` (hoje),
  `applyXpGain/RevertForDay` (hoje/ontem), `normalizeDailyBudgets` (migra
  `dailyXp`→`yesterdayXp` na virada), níveis, inatividade (não usada).
- `src/hooks/useUserStats.ts` — estado + seed do banco; `commit` persiste
  `total_xp/level/daily_xp/daily_xp_date/yesterday_xp/yesterday_xp_date`.
- `src/hooks/useMissions.ts` — `toggle` (não-recorrente: status global;
  recorrente: mapa por-dia `lvl2do.retroCompletions.v1`), `toggleRetroForDay`.
- `src/hooks/AppStateProvider.tsx` — liga conclusão → XP (`completeMission` ou
  `completeMissionForDay`) → streak (`registerCompletion`) → `xp_events`.
- `src/lib/streak.ts` + `src/hooks/useStreak.ts` — streak 1×/dia
  (ontem→+1; gap>1→reseta em 1; persiste em `profiles`).

**O que acontece na virada de dia (estado atual)**
1. **Se o usuário recarrega o app** após 00:00: o seed roda
   `normalizeDailyBudgets` → o `dailyXp` de ontem **migra** para `yesterdayXp`,
   o de hoje zera. ✔ Correto (corrigido em iteração anterior).
2. **Se o app fica aberto** na virada: **nada** detecta a mudança de dia.
   Nenhum timer re-normaliza os orçamentos nem re-renderiza a UI. Todos os
   problemas A1/A2 nascem aqui.

---

## Achados detalhados

### A1 — Virada em sessão aberta perde o orçamento de ontem (ALTA)

**Sintoma:** o usuário usa o app à noite (ex.: 120 XP no dia), deixa a aba
aberta, e depois da meia-noite conclui uma missão. A barra "XP do dia" de
**ontem** no Calendário mostra **0/300** — os 120 XP somem do orçamento (o
total/nível não é afetado; é o rastreio por-dia que se perde).

**Causa:** a migração `dailyXp → yesterdayXp` existe **apenas** em
`normalizeDailyBudgets` (`src/lib/xp-system.ts`), que roda:
- no seed/re-seed do `useUserStats` (isto é, ao **recarregar**), e
- dentro de `applyXpGainForDay`/`applyXpRevertForDay` (usadas só no fluxo
  retroativo/calendário).

O caminho **principal** de conclusão (`completeMission` → `applyXpGain`,
`src/lib/xp-system.ts:179`) **não** normaliza: ele apenas zera a base quando
`dailyXpDate !== todayKey`:

```ts
const sameDay = userStats.dailyXpDate === todayKey;
const dailyXpBase = sameDay ? userStats.dailyXp : 0;   // ← descarta sem migrar
...
dailyXpDate: todayKey,                                  // ← sobrescreve a data
```

Depois disso, o valor de ontem não existe mais em lugar nenhum — quando o
`normalize` rodar, `dailyXpDate` já é hoje e não há o que migrar.

**Prova (simulação com as funções reais):**
```
Dia 1: dailyXp=120. App aberto na virada para o Dia 2.
CENÁRIO A (1ª ação = concluir missão): após applyXpGain → yesterdayXp=0  ✗ (120 perdidos)
CENÁRIO B (recarregou antes):          após normalize   → yesterdayXp=120 ✔
```

**Solução recomendada:** normalizar **dentro** de `applyXpGain` e
`applyXpRevert`, como já é feito nas versões `ForDay`:

```ts
export function applyXpGain(userStats: UserStats, missionXp: number, todayKey: string) {
  const base = normalizeDailyBudgets(userStats, todayKey); // ← migra antes
  const earnedXp = calculateEarnedXpToday(base.dailyXp, missionXp);
  // ... usar `base` no lugar de `userStats` daqui em diante
}
```
Mesma mudança em `applyXpRevert`. Isso é seguro: `normalizeDailyBudgets` é
idempotente (mesmo dia = no-op) e já é a fonte única da regra de virada.

---

### A2 — UI congela no "dia anterior" após a meia-noite (ALTA)

**Sintoma:** com o app aberto às 00:05:
- o card **"XP diário"** continua mostrando o valor de ontem (ex.: 120/300)
  como se fosse de hoje;
- a lista **"Missões pendentes/do dia"** continua a de ontem (missões "Hoje"
  de ontem seguem visíveis; recorrentes concluídas ontem seguem "concluídas");
- a barra do calendário e os pontinhos (hoje=verde/ontem=amarelo) apontam para
  o dia errado.

**Causa:** o "hoje" é capturado em `new Date()` dentro de memos/renderizações
que **não têm o dia como dependência**:
- `useMissions.ts:441` — `todayMissions = useMemo(() => { const now = new Date(); ... }, [missions])`
  → só recalcula quando `missions` muda;
- `useUserStats` — `stats.dailyXp/dailyXpDate` só mudam em ganho/seed;
- `isDoneForDay(m, toISODate(new Date()))` nos consumidores — idem, preso ao
  render antigo.

Nada dispara re-render/normalização quando `getLocalDateKey(new Date())` muda.

**Solução recomendada:** criar um **"day tick"** central — um hook
`useTodayKey()` (ou estado no `AppStateProvider`) com um `setInterval` de
~30–60s que compara `getLocalDateKey(new Date())` com o valor em estado e o
atualiza quando muda. Então:
1. `todayKey` entra como **dependência** dos memos (`todayMissions`, `stats`,
   `dailyForDate`, contadores do dashboard) → tudo re-deriva na virada;
2. no mesmo evento, o `useUserStats` roda
   `commit(normalizeDailyBudgets(statsRef.current, novoTodayKey))` → migra o
   orçamento e **persiste** (mesmo sem reload), fechando o A1 também pela
   segunda via;
3. opcional: disparar aqui a checagem de inatividade (A3) e o reset visual do
   streak (A4).

---

### A3 — Perda de XP por inatividade nunca é aplicada (ALTA)

**Sintoma:** a regra de negócio "−200 XP por dia inteiro sem concluir missão
(pode descer de nível)" **não acontece nunca**. Um usuário pode ficar 30 dias
parado e voltar com o mesmo XP.

**Causa:** código morto. `INACTIVE_DAY_XP_LOSS`, `getInactiveDays` e
`applyInactiveDayLoss` existem em `src/lib/xp-system.ts` (linhas 14, 445, 475),
mas **nenhum arquivo os chama**. O campo `lastXpLossCheckDate` é gravado em
`useUserStats` (linhas 79/152/200) e **nunca lido**. Não há coluna
correspondente no banco — o valor se perde a cada reload, então mesmo que a
checagem existisse, não seria idempotente entre sessões.

**Solução recomendada (em 3 passos):**
1. **Banco:** coluna `last_xp_loss_check_date date` em `profiles` (migração
   idempotente, mesmo padrão das anteriores).
2. **Checagem no seed + no day tick (A2):**
   ```ts
   const lastActivity = profile.last_mission_completed_at (→ dateKey local);
   const alreadyChecked = profile.last_xp_loss_check_date;
   const inactive = getInactiveDays(lastActivity, new Date());
   const unprocessed = /* dias inativos APÓS alreadyChecked */;
   if (unprocessed > 0) {
     const r = applyInactiveDayLoss(stats, unprocessed);
     commit({ ...r.stats, lastXpLossCheckDate: todayKey }); // persiste a marca
     // opcional: logXpEvent(kind:"loss") p/ métricas + toast informando a perda
   }
   ```
3. **Persistência:** incluir `last_xp_loss_check_date` no `persistStats`
   (com o mesmo fallback tolerante usado para `yesterday_*`).

Cuidados: aplicar **uma única vez por dia** (a coluna garante); nunca aplicar
no dia corrente (a função `getInactiveDays` já exclui hoje); conta nova
(`lastActivity = null`) não perde nada.

---

### A4 — Streak exibido congelado após dias perdidos (MÉDIA)

**Sintoma:** usuário com streak 7 fica 5 dias sem concluir nada. O dashboard
continua exibindo **"7 dias"** até a próxima conclusão (quando o
`computeNextStreak` reseta para 1). A exibição mente durante todo o período.

**Causa:** `computeNextStreak` (`src/lib/streak.ts`) é correto, mas só roda
**na conclusão**. Não há reavaliação de exibição na virada de dia; o valor
mostrado é o `profiles.current_streak` bruto.

**Solução recomendada:** derivar o **streak efetivo para exibição**, sem mexer
no persistido:
```ts
// em useStreak (ou seletor): streak "vivo" =
const gap = daysBetweenDateKeys(lastCompletedKey, todayKey);
const displayStreak = gap <= 1 ? current : 0;  // quebrou → mostra 0
```
Usar `displayStreak` no dashboard/perfil (com o `todayKey` do day tick como
dependência). Opcional: no day tick, se `gap > 1`, também zerar o persistido
(decisão de produto; a exibição derivada já resolve a mentira visual).

---

### A5 — Desfazer hoje uma missão concluída ontem não devolve o orçamento de ontem (MÉDIA)

**Sintoma:** missão "uma vez" concluída ontem (50 XP) e desfeita hoje: o
`totalXp` cai 50 ✔, mas a barra de **ontem** continua contando os 50 ✗.

**Causa:** `applyXpRevert` (`xp-system.ts:230`) só devolve espaço no
`dailyXp` quando `dailyXpDate === todayKey` (mesmo dia). Ao cruzar a
meia-noite, o crédito já migrou para `yesterdayXp` — e o revert não o toca.
(O fluxo retroativo de recorrentes **está correto**: `revertMissionForDay`
ajusta o orçamento certo.)

**Solução recomendada:** no `toggle` de não-recorrentes, derivar o dia da
conclusão de `mission.completedAt` (já existe no objeto desde a correção do
reset diário) e rotear o desfazer por `revertMissionForDay(credited, diaDaConclusão)`
em vez de `revertMission` — a função por-dia já trata hoje/ontem/other
corretamente.

---

### A6 — Reversão pós-reload pode devolver mais do que o creditado (MÉDIA)

**Sintoma:** com 280/300 do dia, missão de 50 credita apenas 20 (teto). O
usuário recarrega (o mapa em memória `creditedByMission` se perde) e desfaz:
o fallback devolve os **50 cheios** — 30 a mais.

**Causa:** `useMissions.toggle` usa
`creditedByMission.current[id] ?? target.xp` (fallback deliberado adicionado
para corrigir o bug oposto de "não devolver nada"). O valor exato do crédito
não sobrevive ao reload.

**Solução recomendada (escolher uma):**
- **Precisa:** coluna `credited_xp integer` em `missions`, gravada ao concluir
  e usada no desfazer (migração pequena + `updateMissionStatus` estendido);
- **Sem migração:** derivar de `xp_events` (somar `gain`−`revert` do
  `mission_id`) antes de reverter — 1 query, exato.

O piso 0 do total já impede valores negativos, mas a imprecisão corrói XP
legítimo em contas próximas do teto diário.

---

### A7 — Conclusões por-dia (recorrentes) em localStorage (BAIXA)

`lvl2do.retroCompletions.v1` guarda `{ "missaoId@YYYY-MM-DD": xp }`:
- **não sincroniza entre dispositivos** — o calendário/status de recorrentes
  difere entre o notebook e o celular;
- **cresce sem poda** (um registro por missão/dia, para sempre);
- some no master reset ✔ (já incluído), mas também some se o usuário limpar o
  navegador — apagando o histórico de conclusões.

**Solução (quando fizer sentido):** tabela `mission_completions(user_id,
mission_id, date, credited_xp)` com RLS — resolve A6 e A7 de uma vez e vira a
fonte dos históricos/métricas por dia. É a evolução natural do modelo.

---

### A8 — `year_xp`/métricas dependem de `xp_events` com falhas silenciosas (BAIXA)

O trigger no banco atualiza `year_xp` a partir do **insert** em `xp_events`
(`supabase/2026-social.sql:52`). No app, `logXpEvent(...)` é chamado com
`.catch(() => {})` — se falhar (ex.: o PGRST204 de schema cache que já ocorreu
neste projeto), **ranking anual e gráfico de métricas param de acumular sem
nenhum aviso**, enquanto o XP total continua subindo (divergência).

**Solução recomendada:** trocar os `.catch(() => {})` por
`.catch((e) => console.warn("[xp_events] falha ao logar:", e))` e, em produção,
um contador/telemetria. Opcional: fila de retry local (re-tentar no próximo
load) para não perder eventos.

---

### A9 — Duas abas/estados concorrentes (BAIXA)

Cada aba tem seu `statsRef`/estado; a persistência no `profiles` é
*last-write-wins*. Concluir missões em duas abas simultaneamente pode
sobrescrever contadores (ex.: dailyXp de uma aba "esquece" o ganho da outra
até recarregar). Impacto baixo no uso real.

**Mitigação simples:** re-seed ao focar a janela
(`visibilitychange`/`focus` → `refreshProfile()` quando `!dirty`); solução
completa exigiria RPCs atômicas de incremento no banco.

---

## O que foi verificado e está CORRETO ✔

- **Migração na virada com reload** (`normalizeDailyBudgets`): migra
  `dailyXp`→`yesterdayXp` quando `daily_xp_date` = ontem; zera quando pulou
  dias; **idempotente** (rodar 2× não duplica); preserva conclusões retroativas
  já registradas em ontem (não sobrescreve).
- **Teto diário de 300**: `calculateEarnedXpToday` corta corretamente; os
  orçamentos de hoje e de ontem são independentes (retro não consome o de hoje).
- **Ganho/reversão no mesmo dia**: simétricos (concluir→desfazer volta ao
  estado inicial; ciclos repetidos não inflam).
- **Streak**: avança no máx. 1×/dia; ontem→+1; gap>1→reseta em 1; melhor
  streak preservado; foco e missões compartilham o mesmo streak (1 por dia).
- **Retroativo de ontem**: crédito no orçamento de ontem, evento de XP com a
  data de ontem, não conta streak (decisão registrada), janela fecha na virada.
- **Persistência resiliente**: `persistStats` tem fallback se as colunas
  `yesterday_*` não existirem (não perde `total_xp`).

---

## Plano de correção sugerido (ordem)

1. **A1** — normalizar dentro de `applyXpGain`/`applyXpRevert` (menor mudança,
   maior ganho; puramente em `xp-system.ts`, testável em node).
2. **A2** — `useTodayKey()` (day tick) no provider + `todayKey` nas deps dos
   memos + re-normalize/persist na virada. Fecha o restante da classe
   "app aberto à meia-noite".
3. **A4** — streak de exibição derivado (rápido, junto com o A2).
4. **A5** — rotear desfazer de não-recorrentes por `revertMissionForDay`
   usando `completedAt`.
5. **A3** — inatividade: migração da coluna + checagem no seed/day tick
   (envolve banco; fazer com calma e testar as bordas).
6. **A6/A7** — decidir entre coluna `credited_xp` ou tabela
   `mission_completions` (a tabela resolve os dois e prepara métricas).
7. **A8/A9** — observabilidade e re-seed no focus (melhorias de robustez).
