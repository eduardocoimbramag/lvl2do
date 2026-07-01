# Correção — Missões "Hoje" não resetam no dia seguinte

> **Sintoma relatado:** ao logar no dia seguinte, as missões marcadas apenas
> para **"Hoje"** continuaram aparecendo — deveriam ter saído da lista do dia.

---

## 1. Diagnóstico

### O que uma missão "Hoje" é hoje

Ao criar uma missão com agendamento **"Hoje"**, ela é persistida no Supabase com:

- `schedule_type = "today"`
- `schedule_weekdays = []`
- `schedule_dates = []`

Repare que **nenhuma data é guardada** — não há registro de _qual_ "hoje" a
missão pertence.

### Onde o filtro do dia acontece

A função que decide se uma missão aparece em um determinado dia é
`occursOn` em [`src/hooks/useMissions.ts`](../src/hooks/useMissions.ts):

```ts
export function occursOn(mission: Mission, date: Date): boolean {
  if (mission.schedule.type === "today") {
    return toISODate(date) === toISODate(new Date()); // ⚠️ bug
  }
  return isScheduledOn(mission.schedule, date);
}
```

O bloco `today` compara `date` (o dia sendo avaliado) com **`new Date()` (hoje
real)**. Ele **ignora completamente a missão** — não olha quando ela foi criada.

E a lista do dia é montada assim:

```ts
const todayMissions = useMemo(() => {
  const now = new Date();
  return sortMissions(missions.filter((m) => occursOn(m, now)));
}, [missions]);
```

### A causa raiz

Como `occursOn(missionToday, hoje)` faz `toISODate(hoje) === toISODate(hoje)`,
o resultado é **sempre `true`**, para **qualquer** missão `today`,
**em qualquer dia**.

Ou seja: uma missão "Hoje" criada ontem, ao ser recarregada hoje, continua com
`schedule_type = "today"` e volta a passar no filtro. Na prática, **"Hoje"
virou "Todos os dias"**, porque o sistema nunca soube a qual dia aquele "hoje"
se referia.

Isso não aparecia antes da persistência real porque, com dados apenas em
memória (mock), a lista era recriada a cada carga da página e ninguém "trazia"
missões antigas de volta. Com o Supabase, as missões `today` antigas são
relidas do banco e reexibidas indevidamente.

---

## 2. Correção proposta

Uma missão **"Hoje"** deve ocorrer **apenas no dia em que foi criada**. O banco
já guarda esse dado: a coluna `created_at` de `missions`.

### Mudanças

1. **`Mission` carrega a data de criação.**
   Adicionar um campo opcional `createdAt?: string` (ISO) ao tipo `Mission`
   ([`src/data/types.ts`](../src/data/types.ts)) e preenchê-lo em `rowToMission`
   a partir de `r.created_at`.

2. **`occursOn` para `today` compara com o dia de criação.**
   ```ts
   if (mission.schedule.type === "today") {
     // ocorre só no dia em que foi criada; sem data, cai para o dia atual
     const created = mission.createdAt ? new Date(mission.createdAt) : new Date();
     return toISODate(date) === toISODate(created);
   }
   ```
   Assim, uma missão criada em `2026-06-30` só aparece em `2026-06-30`. No dia
   seguinte, `occursOn` retorna `false` e ela sai da lista do dia — sem apagar
   nada no banco (fica no histórico/calendário).

3. **Missões criadas localmente** (antes de o banco devolver o `created_at`)
   recebem `createdAt = agora` no momento da criação otimista, para o filtro
   funcionar já na primeira renderização.

### Por que não apagar as missões antigas

Elas continuam válidas como histórico (aparecem no dia correto no **Calendário
de missões**). Só deixam de poluir a lista de "hoje". Nenhuma migração de banco
é necessária — usamos o `created_at` que já existe.

---

## 3. Efeitos colaterais verificados

- **Calendário de missões:** ao selecionar um dia passado, missões `today`
  daquele dia passam a aparecer corretamente (antes só apareciam "hoje").
- **Métricas / XP:** nada muda no cálculo de XP; a correção é só de
  visibilidade por dia.
- **Missões `weekly` / `dates`:** inalteradas — continuam pela regra própria.
- **Fuso horário:** a comparação usa `toISODate` (data **local**), consistente
  com o resto do app.

---

## 4. Teste manual

1. Crie uma missão com agendamento **"Hoje"**.
2. Confirme que ela aparece na lista do dia.
3. Simule o dia seguinte (ou aguarde a virada do dia) e recarregue.
4. **Esperado:** a missão de ontem **não** aparece mais na lista de hoje, mas
   continua visível no **Calendário de missões** ao selecionar o dia de ontem.
